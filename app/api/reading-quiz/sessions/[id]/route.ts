import { NextRequest, NextResponse } from "next/server";
import { neonDb } from "@/lib/db";
import { getRequestContext } from "@/lib/requestContext";
import { internalError } from "@/lib/apiUtils";
import { QUESTION_COUNT } from "@/config/readingQuiz";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { owner, hashedIp } = await getRequestContext(req);
    const { id } = await params;

    const rows = owner
      ? await neonDb`SELECT * FROM reading_quiz_sessions WHERE id = ${id} LIMIT 1`
      : await neonDb`SELECT * FROM reading_quiz_sessions WHERE id = ${id} AND hashed_ip = ${hashedIp} LIMIT 1`;

    if (rows.length === 0)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ session: rows[0] });
  } catch {
    return internalError();
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { owner, hashedIp } = await getRequestContext(req);
    const { id } = await params;
    const body = await req.json();
    const { answers_json, score } = body as {
      answers_json: string;
      score: number;
    };

    if (typeof answers_json !== "string" || answers_json.length > 200) {
      return NextResponse.json({ error: "Invalid answers" }, { status: 400 });
    }
    if (!Number.isInteger(score) || score < 0 || score > QUESTION_COUNT) {
      return NextResponse.json({ error: "Invalid score" }, { status: 400 });
    }

    const rows = owner
      ? await neonDb`
          UPDATE reading_quiz_sessions
          SET answers_json = ${answers_json}, score = ${score}
          WHERE id = ${id}
          RETURNING id
        `
      : await neonDb`
          UPDATE reading_quiz_sessions
          SET answers_json = ${answers_json}, score = ${score}
          WHERE id = ${id} AND hashed_ip = ${hashedIp}
          RETURNING id
        `;

    if (rows.length === 0)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return internalError();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { owner } = await getRequestContext(req);
    if (!owner)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    await neonDb`DELETE FROM reading_quiz_sessions WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch {
    return internalError();
  }
}
