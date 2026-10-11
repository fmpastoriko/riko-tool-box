import { NextRequest, NextResponse } from "next/server";
import {
  LANGS,
  MAX_PASSAGE_VERSES,
  MIN_PASSAGE_VERSES,
  PASSAGE_SCOPES,
  SOURCES,
  type Lang,
  type PassageScope,
  type Source,
} from "@/config/readingQuiz";
import { fetchRandomPassage } from "@/lib/bible";
import { fetchLatestArticle } from "@/lib/news";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const limit = checkRateLimit(req, 30);
  if (!limit.allowed)
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  const body = await req.json();
  const { source, lang, scope, verseCount } = body as {
    source: Source;
    lang: Lang;
    scope: PassageScope;
    verseCount: number;
  };

  if (!SOURCES.some((s) => s.value === source)) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }
  if (!LANGS.some((l) => l.value === lang)) {
    return NextResponse.json({ error: "Invalid language" }, { status: 400 });
  }
  if (source === "bible") {
    if (!PASSAGE_SCOPES.some((s) => s.value === scope)) {
      return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
    }
    if (
      !Number.isInteger(verseCount) ||
      verseCount < MIN_PASSAGE_VERSES ||
      verseCount > MAX_PASSAGE_VERSES
    ) {
      return NextResponse.json(
        { error: "Invalid verse count" },
        { status: 400 },
      );
    }
  }

  try {
    const reading =
      source === "news"
        ? await fetchLatestArticle(lang)
        : await fetchRandomPassage(scope, verseCount, lang);
    return NextResponse.json({ reading });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[reading-quiz/text]", msg);
    return NextResponse.json({ error: "Failed to fetch text" }, { status: 502 });
  }
}
