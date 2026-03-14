import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { createHash } from "crypto";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function obfuscateText(text: string, index: number, side: "a" | "b"): string {
  const lines = text.split("\n").length;
  const words = text.split(/\s+/).filter(Boolean).length;
  return `text_${index}_${side} · ${lines} line${lines !== 1 ? "s" : ""} · ${words} word${words !== 1 ? "s" : ""}`;
}

function obfuscateId(index: number): string {
  return `comparison_${index + 1}`;
}

export async function GET(req: NextRequest) {
  try {
    const secret = req.headers.get("x-history-secret") ?? "";
    const serverHash = process.env.HISTORY_SECRET_HASH ?? "";
    const authenticated = serverHash !== "" && sha256(secret) === serverHash;

    const rows = await sql`
      SELECT id, text_a, text_b, created_at
      FROM comparisons
      ORDER BY created_at DESC
      LIMIT 100
    `;

    if (authenticated) {
      return NextResponse.json({ authenticated: true, comparisons: rows });
    }

    const obfuscated = rows.map((row, i) => ({
      id: obfuscateId(i),
      text_a: obfuscateText(row.text_a as string, i + 1, "a"),
      text_b: obfuscateText(row.text_b as string, i + 1, "b"),
      created_at: row.created_at,
      lines_added: (row.text_b as string).split("\n").length,
      lines_removed: (row.text_a as string).split("\n").length,
    }));

    return NextResponse.json({ authenticated: false, comparisons: obfuscated });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
