import { NextRequest, NextResponse } from "next/server";
import { neonDb } from "@/lib/db";
import { getServerRole, isOwnerRole } from "@/lib/session";
import { decrypt } from "@/lib/encrypt";
import { sha256 } from "@/lib/auth";
import { getIp } from "@/lib/ip";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const role = await getServerRole();
  const owner = isOwnerRole(role);
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
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  }
  try {
    const hashedIp = sha256(getIp(req));
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const role = await getServerRole();
  if (!isOwnerRole(role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    await neonDb`DELETE FROM chat_sessions WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
