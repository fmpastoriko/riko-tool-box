import { NextRequest, NextResponse } from "next/server";
import { neonDb } from "@/lib/db";
import { getRequestContext } from "@/lib/requestContext";
import { attachIsOwn } from "@/lib/sessionHelpers";
import { internalError } from "@/lib/apiUtils";
import { LANGS, SOURCES } from "@/config/readingQuiz";

async function ensureTable() {
  await neonDb`CREATE TABLE IF NOT EXISTS reading_quiz_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    lang TEXT NOT NULL,
    title TEXT NOT NULL,
    origin TEXT NOT NULL,
    url TEXT,
    passage_text TEXT NOT NULL,
    questions_json TEXT NOT NULL,
    answers_json TEXT,
    score INT,
    hashed_ip TEXT,
    user_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
}

export async function GET(req: NextRequest) {
  try {
    const { owner, hashedIp } = await getRequestContext(req);
    await ensureTable();
    const rows = await neonDb`
      SELECT id, source, lang, title, origin, url, passage_text, questions_json,
             answers_json, score, hashed_ip, created_at
      FROM reading_quiz_sessions
      ORDER BY created_at DESC
      LIMIT 100
    `;
    return NextResponse.json({
      authenticated: owner,
      sessions: attachIsOwn(rows, owner, hashedIp),
    });
  } catch {
    return internalError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { source, lang, title, origin, url, passage_text, questions_json } =
      body;

    if (!title || !origin || !passage_text || !questions_json) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (
      !SOURCES.some((s) => s.value === source) ||
      !LANGS.some((l) => l.value === lang) ||
      (url != null &&
        (typeof url !== "string" || !url.startsWith("https://")))
    ) {
      return NextResponse.json({ error: "Invalid fields" }, { status: 400 });
    }

    await ensureTable();

    const { owner, hashedIp } = await getRequestContext(req);
    const userId = owner ? "owner" : hashedIp;

    const [row] = await neonDb`
      INSERT INTO reading_quiz_sessions
        (source, lang, title, origin, url, passage_text, questions_json, hashed_ip, user_id)
      VALUES
        (${source}, ${lang}, ${title}, ${origin}, ${url ?? null}, ${passage_text}, ${questions_json}, ${hashedIp}, ${userId})
      RETURNING id, created_at
    `;

    return NextResponse.json({ id: row.id, created_at: row.created_at });
  } catch {
    return internalError();
  }
}
