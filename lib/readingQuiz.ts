import {
  OPTIONS_PER_QUESTION,
  QUESTION_COUNT,
  type Lang,
  type Source,
} from "@/config/readingQuiz";
import { QUESTION_POOL } from "@/config/questionPool";
import { parseJsonArray } from "@/lib/llmJson";

export interface Reading {
  source: Source;
  lang: Lang;
  title: string;
  origin: string;
  url: string | null;
  paragraphs: string[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface ReadingQuiz extends Reading {
  questions: QuizQuestion[];
}

export const MAX_PASSAGE_CHARS = 8000;
export const MAX_QUESTION_CHARS = 400;
export const MAX_OPTION_CHARS = 240;
export const MAX_EXPLANATION_CHARS = 300;

const LANGUAGE_NAMES: Record<Lang, string> = {
  id: "Bahasa Indonesia",
  en: "English",
};

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

export function decodeEntities(raw: string): string {
  return raw.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (_, entity: string) => {
    if (entity[0] !== "#") return NAMED_ENTITIES[entity.toLowerCase()] ?? " ";
    const hex = entity[1].toLowerCase() === "x";
    const code = parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : " ";
  });
}

export function stripMarkup(raw: string): string {
  return decodeEntities(
    raw.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, ""),
  )
    .replace(/\s+/g, " ")
    .trim();
}

export function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function readingToText(paragraphs: string[]): string {
  return paragraphs.join("\n\n");
}

export function textToParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function pickQuestionStems(lang: Lang): string[] {
  const stems = QUESTION_POOL.map((slot, category) =>
    shuffle(slot.stems[lang]).map((stem) => ({ category, stem })),
  );
  const extra = shuffle(stems.flatMap((s) => s.slice(1))).slice(
    0,
    QUESTION_COUNT - stems.length,
  );
  return [...stems.map((s) => s[0]), ...extra]
    .sort((a, b) => a.category - b.category)
    .map((s) => s.stem);
}

export function buildQuizPrompt(
  title: string,
  lang: Lang,
  passageText: string,
  stems: string[],
): string {
  const language = LANGUAGE_NAMES[lang];
  const labeled = textToParagraphs(passageText)
    .map((p, i) => `[Paragraph ${i + 1}] ${p}`)
    .join("\n\n");
  const optionSlots = Array(OPTIONS_PER_QUESTION).fill('"..."').join(",");

  return `Write ${stems.length} UTBK-style reading comprehension multiple choice questions in ${language} about the text below.

Text: ${title}
Each paragraph is tagged [Paragraph N] here, but readers see the text without any numbers.
"""
${labeled}
"""

Question patterns, one per question, in this order. N is a paragraph position and "..." is a word, phrase, or idea you take from the text. Fill them in, never copy the placeholders literally. Refer to paragraphs by ordinal word (Indonesian: paragraf pertama, paragraf kedua; English: the first paragraph, the second paragraph), never by number or tag.
${stems.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Strict rules:
- Output ONLY a raw JSON array, no markdown, no extra prose.
- Format: [{"question":"...","options":[${optionSlots}],"answerIndex":0,"explanation":"..."}]
- Exactly ${stems.length} questions, following the patterns above in order.
- Each question has exactly ${OPTIONS_PER_QUESTION} distinct options. "answerIndex" is the 0-based index of the correct option.
- Every answer must be provable from the text alone. No outside knowledge, no invented details.
- Wrong options must be plausible: names, places, numbers, or ideas that appear in the text, half-true statements, or restatements that are too broad or too narrow.
- Never use options like "all of the above" or "none of the above".
- When a question quotes a word, phrase, or sentence, copy it exactly from the text.
- "explanation" is one short sentence that names the supporting paragraph by ordinal word.
- Write the questions, options, and explanations in ${language}.`;
}

function clean(value: unknown, maxChars: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxChars);
}

function shuffleOptions(
  options: string[],
  answerIndex: number,
): { options: string[]; answerIndex: number } {
  const order = shuffle(options.map((_, i) => i));
  return {
    options: order.map((i) => options[i]),
    answerIndex: order.indexOf(answerIndex),
  };
}

export function parseQuizQuestions(raw: string, count: number): QuizQuestion[] {
  const parsed = parseJsonArray(raw);
  if (!parsed) return [];

  const out: QuizQuestion[] = [];
  const seen = new Set<string>();

  for (const item of parsed as Record<string, unknown>[]) {
    if (!item || typeof item !== "object") continue;

    const question = clean(item.question, MAX_QUESTION_CHARS);
    if (question.length < 8) continue;

    const key = question.toLowerCase();
    if (seen.has(key)) continue;

    const rawOptions = Array.isArray(item.options) ? item.options : [];
    const options = rawOptions
      .map((o) => clean(o, MAX_OPTION_CHARS))
      .filter((o) => o.length > 0)
      .slice(0, OPTIONS_PER_QUESTION);
    if (options.length !== OPTIONS_PER_QUESTION) continue;
    if (new Set(options.map((o) => o.toLowerCase())).size !== options.length)
      continue;

    const answerIndex = Number(item.answerIndex);
    if (
      !Number.isInteger(answerIndex) ||
      answerIndex < 0 ||
      answerIndex >= OPTIONS_PER_QUESTION
    )
      continue;

    const shuffled = shuffleOptions(options, answerIndex);
    seen.add(key);
    out.push({
      question,
      options: shuffled.options,
      answerIndex: shuffled.answerIndex,
      explanation: clean(item.explanation, MAX_EXPLANATION_CHARS),
    });
    if (out.length >= count) break;
  }

  return out;
}
