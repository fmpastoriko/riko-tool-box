import { NextRequest, NextResponse } from "next/server";
import { LANGS, QUESTION_COUNT, type Lang } from "@/config/readingQuiz";
import {
  MAX_PASSAGE_CHARS,
  buildQuizPrompt,
  parseQuizQuestions,
  pickQuestionStems,
  type QuizQuestion,
} from "@/lib/readingQuiz";
import { generateText } from "@/lib/llm";
import { checkRateLimit } from "@/lib/rateLimit";
import { getServerRole, isOwnerRole } from "@/lib/session";

const MAX_TITLE_CHARS = 200;

export async function POST(req: NextRequest) {
  const limit = checkRateLimit(req, 20);
  if (!limit.allowed)
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  const body = await req.json();
  const { title, lang, passageText } = body as {
    title: string;
    lang: Lang;
    passageText: string;
  };

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Missing title" }, { status: 400 });
  }
  if (!LANGS.some((l) => l.value === lang)) {
    return NextResponse.json({ error: "Invalid language" }, { status: 400 });
  }
  if (
    typeof passageText !== "string" ||
    passageText.trim().length < 40 ||
    passageText.length > MAX_PASSAGE_CHARS
  ) {
    return NextResponse.json({ error: "Invalid passage" }, { status: 400 });
  }

  const role = await getServerRole();
  const owner = isOwnerRole(role);
  const prompt = buildQuizPrompt(
    title.trim().slice(0, MAX_TITLE_CHARS),
    lang,
    passageText.trim(),
    pickQuestionStems(lang),
  );

  try {
    const { text, modelUsed } = await generateText(prompt, owner);
    let questions = parseQuizQuestions(text, QUESTION_COUNT);

    if (questions.length < QUESTION_COUNT) {
      const retry = await generateText(prompt, owner);
      const extra = parseQuizQuestions(retry.text, QUESTION_COUNT);
      const seen = new Set(questions.map((q) => q.question.toLowerCase()));
      const merged: QuizQuestion[] = [...questions];
      for (const q of extra) {
        if (merged.length >= QUESTION_COUNT) break;
        if (seen.has(q.question.toLowerCase())) continue;
        seen.add(q.question.toLowerCase());
        merged.push(q);
      }
      questions = merged;
    }

    if (questions.length === 0) {
      return NextResponse.json(
        { error: "Model returned no usable questions" },
        { status: 502 },
      );
    }

    return NextResponse.json({ questions, modelUsed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[reading-quiz/quiz]", msg);
    return NextResponse.json(
      { error: "Failed to generate questions" },
      { status: 500 },
    );
  }
}
