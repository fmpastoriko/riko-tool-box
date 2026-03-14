import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { text_a, text_b } = await req.json();
    if (typeof text_a !== "string" || typeof text_b !== "string") {
      return NextResponse.json(
        { error: "text_a and text_b required" },
        { status: 400 },
      );
    }
    const id = randomUUID();
    await sql`INSERT INTO comparisons (id, text_a, text_b) VALUES (${id}, ${text_a}, ${text_b})`;
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
