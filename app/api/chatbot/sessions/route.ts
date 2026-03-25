import { NextRequest, NextResponse } from "next/server";
import { neonDb } from "@/lib/db";
import { getRequestContext } from "@/lib/requestContext";
import { internalError } from "@/lib/apiUtils";

export async function GET(req: NextRequest) {
  try {
    const { owner, hashedIp, ownerUserId } = await getRequestContext(req);

    if (owner) {
      const rows =
        await neonDb`SELECT id, title, repo_path, model, created_at FROM chat_sessions WHERE user_id = ${ownerUserId} ORDER BY created_at DESC LIMIT 10`;
      return NextResponse.json({ sessions: rows });
    }

    const rows = await neonDb`
      SELECT id, title, repo_path, model, created_at FROM chat_sessions
      WHERE user_id = ${hashedIp}
      AND (${ownerUserId}::text IS NULL OR user_id != ${ownerUserId})
      ORDER BY created_at DESC LIMIT 10
    `;
    return NextResponse.json({ sessions: rows });
  } catch {
    return internalError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const { owner, hashedIp, ownerUserId } = await getRequestContext(req);
    const userId = owner ? ownerUserId : hashedIp;
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
    return internalError();
  }
}