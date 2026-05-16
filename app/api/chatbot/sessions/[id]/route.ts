import { NextRequest, NextResponse } from "next/server";
import { neonDb } from "@/lib/db";
import { getRequestContext } from "@/lib/requestContext";
import { decrypt } from "@/lib/encrypt";
import { internalError } from "@/lib/apiUtils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { owner, hashedIp } = await getRequestContext(req);
  const { id } = await params;
  if (owner) {
    try {
      const [session] =
        await neonDb`SELECT id, title, repo_path, model, created_at FROM chat_sessions WHERE id = ${id}`;
      if (!session)
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      const messages =
        await neonDb`SELECT id, role, content, created_at FROM chat_messages WHERE session_id = ${id} ORDER BY created_at ASC`;
      const decrypted = messages.map((m) => ({
        ...m,
        content: decrypt(m.content as string),
      }));
      return NextResponse.json({ session, messages: decrypted });
    } catch {
      return internalError();
    }
  }
  try {
    const [session] =
      await neonDb`SELECT id, title, repo_path, model, user_id, created_at FROM chat_sessions WHERE id = ${id}`;
    if (!session)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (session.user_id !== hashedIp)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const messages =
      await neonDb`SELECT id, role, content, created_at FROM chat_messages WHERE session_id = ${id} ORDER BY created_at ASC`;
    return NextResponse.json({ session, messages });
  } catch {
    return internalError();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { owner } = await getRequestContext(req);
  if (!owner)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    await neonDb`DELETE FROM chat_sessions WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch {
    return internalError();
  }
}