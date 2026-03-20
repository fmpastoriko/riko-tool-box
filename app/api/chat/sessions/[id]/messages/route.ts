import { NextRequest, NextResponse } from "next/server";
import { neonDb } from "@/lib/db";
import { getServerRole, isOwnerRole } from "@/lib/session";
import { encryptIfOwner } from "@/lib/encrypt";

const VALID_ROLES = new Set(["user", "assistant", "system"]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { role, content } = await req.json();
    if (!role || !content)
      return NextResponse.json(
        { error: "role and content required" },
        { status: 400 },
      );
    if (!VALID_ROLES.has(role))
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    const serverRole = await getServerRole();
    const owner = isOwnerRole(serverRole);
    const [{ count }] =
      await neonDb`SELECT COUNT(*)::int AS count FROM chat_messages WHERE session_id = ${id}`;
    if (count >= 100)
      return NextResponse.json(
        { error: "Message limit reached (100)" },
        { status: 429 },
      );
    const userId = owner ? (process.env.OWNER_EMAIL ?? null) : null;
    const [message] = await neonDb`
      INSERT INTO chat_messages (session_id, role, content, user_id)
      VALUES (${id}, ${role}, ${encryptIfOwner(content, owner)}, ${userId})
      RETURNING id, role, created_at
    `;
    return NextResponse.json({ message: { ...message, content } });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
