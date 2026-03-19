import { NextRequest, NextResponse } from "next/server";
import { neonDb } from "@/lib/db";
import { encryptIfOwner } from "@/lib/encrypt";
import { getServerRole, isOwnerRole } from "@/lib/session";
import { checkRateLimit } from "@/lib/rateLimit";
import { sha256 } from "@/lib/auth";
import { randomUUID } from "crypto";
import { getIp } from "@/lib/ip";

export async function POST(req: NextRequest) {
  const { allowed } = checkRateLimit(req, 30);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const { text_a, text_b } = await req.json();
    if (typeof text_a !== "string" || typeof text_b !== "string") {
      return NextResponse.json(
        { error: "text_a and text_b required" },
        { status: 400 },
      );
    }

    const role = await getServerRole();
    const owner = isOwnerRole(role);
    const id = randomUUID();
    const userId = owner ? (process.env.OWNER_EMAIL ?? null) : null;
    const hashedIp = sha256(getIp(req));

    await neonDb`
      INSERT INTO comparisons (id, text_a, text_b, user_id, hashed_ip)
      VALUES (
        ${id},
        ${encryptIfOwner(text_a, owner)},
        ${encryptIfOwner(text_b, owner)},
        ${userId},
        ${hashedIp}
      )
    `;

    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
