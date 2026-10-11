import {
  BIBLE_API_BASE,
  BIBLE_BOOKS,
  BIBLE_TRANSLATIONS,
  FETCH_TIMEOUT_MS,
  MAX_PASSAGE_VERSES,
  MIN_PASSAGE_VERSES,
  PASSAGE_PICK_ATTEMPTS,
  type BibleBook,
  type Lang,
  type PassageScope,
} from "@/config/readingQuiz";
import { stripMarkup, type Reading, type ReadingUnit } from "@/lib/readingQuiz";

export function booksForScope(scope: PassageScope): BibleBook[] {
  if (scope === "narrative") return BIBLE_BOOKS.filter((b) => b.narrative);
  if (scope === "old") return BIBLE_BOOKS.filter((b) => b.testament === "old");
  if (scope === "new") return BIBLE_BOOKS.filter((b) => b.testament === "new");
  return BIBLE_BOOKS;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

async function fetchChapter(
  translation: string,
  bookId: number,
  chapter: number,
): Promise<ReadingUnit[]> {
  const res = await fetch(
    `${BIBLE_API_BASE}/get-text/${translation}/${bookId}/${chapter}/`,
    { cache: "no-store", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
  );
  if (!res.ok) throw new Error(`Bible API error ${res.status}`);

  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) throw new Error("Bible API returned no verses");

  return (data as { verse?: unknown; text?: unknown }[])
    .map((v) => ({
      label: typeof v.verse === "number" ? v.verse : 0,
      text: typeof v.text === "string" ? stripMarkup(v.text) : "",
    }))
    .filter((v) => v.label > 0 && v.text.length > 0)
    .sort((a, b) => a.label - b.label);
}

export function formatReference(
  bookName: string,
  chapter: number,
  verseStart: number,
  verseEnd: number,
): string {
  const verses =
    verseStart === verseEnd ? `${verseStart}` : `${verseStart}-${verseEnd}`;
  return `${bookName} ${chapter}:${verses}`;
}

export async function fetchRandomPassage(
  scope: PassageScope,
  verseCount: number,
  lang: Lang,
): Promise<Reading> {
  const books = booksForScope(scope);
  if (books.length === 0) throw new Error("No books in scope");

  const translation = BIBLE_TRANSLATIONS[lang];
  const wanted = Math.min(
    Math.max(verseCount, MIN_PASSAGE_VERSES),
    MAX_PASSAGE_VERSES,
  );

  let lastError: unknown = null;

  for (let attempt = 0; attempt < PASSAGE_PICK_ATTEMPTS; attempt++) {
    const book = pickRandom(books);
    const chapter = 1 + Math.floor(Math.random() * book.chapters);
    try {
      const verses = await fetchChapter(translation, book.id, chapter);
      if (verses.length < MIN_PASSAGE_VERSES) continue;

      const take = Math.min(wanted, verses.length);
      const startIndex = Math.floor(Math.random() * (verses.length - take + 1));
      const units = verses.slice(startIndex, startIndex + take);

      return {
        source: "bible",
        lang,
        title: formatReference(
          book.names[lang],
          chapter,
          units[0].label,
          units[units.length - 1].label,
        ),
        origin: translation,
        url: null,
        units,
      };
    } catch (e) {
      lastError = e;
    }
  }

  throw new Error(
    lastError instanceof Error
      ? `Could not fetch a passage: ${lastError.message}`
      : "Could not fetch a passage",
  );
}
