import { NextRequest, NextResponse } from "next/server";
import { neonDb } from "@/lib/db";
import { getRequestContext } from "@/lib/requestContext";
import { checkRateLimit } from "@/lib/rateLimit";

interface ReviewItem {
  word: string;
  clue?: string;
}

const REVIEW_DELAY_DAYS = 7;

async function ensureTable() {
  await neonDb`CREATE TABLE IF NOT EXISTS tts_review_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    word TEXT NOT NULL,
    clue TEXT NOT NULL,
    marked_at_session_count INT NOT NULL DEFAULT 0,
    shown_count INT NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  await neonDb`ALTER TABLE tts_review_queue ADD COLUMN IF NOT EXISTS crossword_id INT`;
  await neonDb`ALTER TABLE tts_review_queue ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ`;
}

async function crosswordBelongsToUser(
  userId: string,
  crosswordId: number,
): Promise<boolean> {
  const rows = (await neonDb`
    SELECT 1 FROM tts_sessions
    WHERE user_id = ${userId} AND user_session_index = ${crosswordId}
    LIMIT 1
  `) as unknown[];
  return rows.length > 0;
}

export async function POST(req: NextRequest) {
  const limit = checkRateLimit(req, 30);
  if (!limit.allowed)
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  const body = await req.json();
  const { items, crosswordId } = body as {
    items: ReviewItem[];
    crosswordId: number;
  };

  if (!Number.isInteger(crosswordId) || crosswordId < 1) {
    return NextResponse.json(
      { error: "crosswordId required (integer >= 1)" },
      { status: 400 },
    );
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "No items" }, { status: 400 });
  }

  const cleaned: { word: string; clue: string }[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    if (typeof it.word !== "string") continue;
    const word = it.word.toUpperCase().replace(/[^A-Z]/g, "");
    const clue = typeof it.clue === "string" ? it.clue.trim() : "";
    if (word.length < 3 || word.length > 20) continue;
    if (seen.has(word)) continue;
    seen.add(word);
    cleaned.push({ word, clue });
    if (cleaned.length >= 50) break;
  }
  if (cleaned.length === 0) {
    return NextResponse.json({ error: "No valid items" }, { status: 400 });
  }

  const { owner, hashedIp } = await getRequestContext(req);
  const userId = owner ? "owner" : hashedIp;

  try {
    await ensureTable();
    const exists = await crosswordBelongsToUser(userId, crosswordId);
    if (!exists) {
      return NextResponse.json(
        { error: `Crossword #${crosswordId} not found for this user` },
        { status: 404 },
      );
    }
    for (const it of cleaned) {
      await neonDb`
        INSERT INTO tts_review_queue
          (user_id, word, clue, crossword_id, due_at)
        VALUES (
          ${userId},
          ${it.word},
          ${it.clue},
          ${crosswordId},
          NOW() + (${REVIEW_DELAY_DAYS} * INTERVAL '1 day')
        )
      `;
    }
    return NextResponse.json({ ok: true, added: cleaned.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[crosswords/review]", msg);
    return NextResponse.json({ error: `Failed: ${msg}` }, { status: 500 });
  }
}
