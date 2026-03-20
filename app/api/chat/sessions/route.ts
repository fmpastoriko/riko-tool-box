import { NextRequest, NextResponse } from "next/server";
import { neonDb } from "@/lib/db";
import { getServerRole, isOwnerRole } from "@/lib/session";
import { sha256 } from "@/lib/auth";
import { getIp } from "@/lib/ip";

export async function GET(req: NextRequest) {
  try {
    const role = await getServerRole();
    const owner = isOwnerRole(role);
    if (owner) {
      const rows =
        await neonDb`SELECT id, title, repo_path, model, created_at FROM chat_sessions ORDER BY created_at DESC LIMIT 10`;
      return NextResponse.json({ sessions: rows });
    }
    const hashedIp = sha256(getIp(req));
    const ownerUserId = process.env.OWNER_EMAIL ?? null;
    const rows = await neonDb`
      SELECT id, title, repo_path, model, created_at FROM chat_sessions
      WHERE user_id = ${hashedIp}
      AND (${ownerUserId}::text IS NULL OR user_id != ${ownerUserId})
      ORDER BY created_at DESC LIMIT 10
    `;
    return NextResponse.json({ sessions: rows });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = await getServerRole();
    const owner = isOwnerRole(role);
    const userId = owner
      ? (process.env.OWNER_EMAIL ?? null)
      : sha256(getIp(req));
    const { title, repo_path, model } = await req.json();
    if (!title)
      return NextResponse.json({ error: "title required" }, { status: 400 });
    const safeTitle = String(title).slice(0, 60);
    const [session] = await neonDb`
      INSERT INTO chat_sessions (title, repo_path, model, user_id)
      VALUES (${safeTitle}, ${repo_path ?? null}, ${model ?? null}, ${userId})
      RETURNING id, title, repo_path, model, created_at
    `;
    if (owner) {
      await neonDb`DELETE FROM chat_sessions WHERE id NOT IN (SELECT id FROM chat_sessions ORDER BY created_at DESC LIMIT 10)`;
    }
    return NextResponse.json({ session });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
