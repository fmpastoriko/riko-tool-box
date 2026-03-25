import { NextRequest, NextResponse } from "next/server";
import { neonDb } from "@/lib/db";
import { requireAuth, internalError } from "@/lib/apiUtils";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authGuard = requireAuth(req);
  if (authGuard) return authGuard;
  try {
    const { id } = await params;
    const { label, body } = await req.json();
    const [row] =
      await neonDb`UPDATE prompt_templates SET label = ${label}, body = ${body} WHERE id = ${id} RETURNING *`;
    return NextResponse.json({ template: row });
  } catch {
    return internalError();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authGuard = requireAuth(req);
  if (authGuard) return authGuard;
  try {
    const { id } = await params;
    await neonDb`DELETE FROM prompt_templates WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch {
    return internalError();
  }
}
