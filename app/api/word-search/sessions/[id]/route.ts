import { NextRequest, NextResponse } from "next/server";
import { neonDb } from "@/lib/db";
import { getRequestContext } from "@/lib/requestContext";
import { internalError } from "@/lib/apiUtils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { owner, hashedIp } = await getRequestContext(req);
    const { id } = await params;

    const rows = owner
      ? await neonDb`SELECT * FROM word_search_sessions WHERE id = ${id} LIMIT 1`
      : await neonDb`SELECT * FROM word_search_sessions WHERE id = ${id} AND hashed_ip = ${hashedIp} LIMIT 1`;

    if (rows.length === 0)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ session: rows[0] });
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
    await neonDb`DELETE FROM word_search_sessions WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch {
    return internalError();
  }
}
