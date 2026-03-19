import { NextRequest, NextResponse } from "next/server";
import { neonDb } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const { label, body } = await req.json();
    const [row] = await neonDb`
      UPDATE prompt_templates SET label = ${label}, body = ${body}
      WHERE id = ${id}
      RETURNING *
    `;
    return NextResponse.json({ template: row });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    await neonDb`DELETE FROM prompt_templates WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
