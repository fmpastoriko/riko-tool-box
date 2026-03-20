import { NextRequest, NextResponse } from "next/server";
import { neonDb } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

export async function GET() {
  try {
    const rows = await neonDb`
      SELECT id, label, body, used_count, sort_order, created_at
      FROM prompt_templates ORDER BY used_count DESC, sort_order ASC
    `;
    return NextResponse.json({ templates: rows });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { label, body } = await req.json();
    if (!label || !body) {
      return NextResponse.json(
        { error: "label and body required" },
        { status: 400 },
      );
    }
    const [row] =
      await neonDb`INSERT INTO prompt_templates (label, body) VALUES (${label}, ${body}) RETURNING *`;
    return NextResponse.json({ template: row });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
