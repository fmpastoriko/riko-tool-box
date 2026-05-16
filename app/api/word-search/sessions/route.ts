import { NextRequest, NextResponse } from "next/server";
import { neonDb } from "@/lib/db";
import { getRequestContext } from "@/lib/requestContext";
import { attachIsOwn } from "@/lib/sessionHelpers";
import { internalError } from "@/lib/apiUtils";

async function ensureTable() {
  await neonDb`CREATE TABLE IF NOT EXISTS word_search_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT NOT NULL,
    options_json TEXT NOT NULL,
    puzzles_json TEXT NOT NULL,
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
      SELECT id, topic, options_json, puzzles_json, hashed_ip, created_at
      FROM word_search_sessions
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
    const { topic, options_json, puzzles_json } = body;

    if (!topic || !options_json || !puzzles_json) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await ensureTable();

    const { owner, hashedIp } = await getRequestContext(req);
    const userId = owner ? "owner" : hashedIp;

    const [row] = await neonDb`
      INSERT INTO word_search_sessions (topic, options_json, puzzles_json, hashed_ip, user_id)
      VALUES (${topic}, ${options_json}, ${puzzles_json}, ${hashedIp}, ${userId})
      RETURNING id, created_at
    `;

    return NextResponse.json({ id: row.id, created_at: row.created_at });
  } catch {
    return internalError();
  }
}
