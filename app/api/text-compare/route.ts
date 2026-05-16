import { NextRequest, NextResponse } from "next/server";
import { neonDb } from "@/lib/db";
import { getRequestContext } from "@/lib/requestContext";
import { decrypt, encryptIfOwner } from "@/lib/encrypt";
import { attachIsOwn, filterOwnerRows } from "@/lib/sessionHelpers";
import { internalError } from "@/lib/apiUtils";

export async function GET(req: NextRequest) {
  try {
    const { owner, hashedIp, ownerUserId } = await getRequestContext(req);
    const rows =
      await neonDb`SELECT id, text_a, text_b, created_at, hashed_ip, user_id FROM comparisons ORDER BY created_at DESC LIMIT 100`;
    const withOwn = attachIsOwn(rows, owner, hashedIp);
    const comparisons = filterOwnerRows(withOwn, owner, ownerUserId)
      .map((row) => {
        if (row.is_own) {
          return {
            id: row.id,
            text_a: owner
              ? decrypt(row.text_a as string)
              : (row.text_a as string),
            text_b: owner
              ? decrypt(row.text_b as string)
              : (row.text_b as string),
            created_at: row.created_at,
            is_own: true,
          };
        }
        return {
          id: row.id,
          text_a: "···",
          text_b: "···",
          created_at: row.created_at,
          is_own: false,
        };
      });
    return NextResponse.json({ authenticated: owner, comparisons });
  } catch {
    return internalError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const { owner, hashedIp, ownerUserId } = await getRequestContext(req);
    const userId = owner ? ownerUserId : hashedIp;
    const { text_a, text_b } = await req.json();
    if (!text_a || !text_b) {
      return NextResponse.json({ error: "text_a and text_b required" }, { status: 400 });
    }
    const [comparison] = await neonDb`
      INSERT INTO comparisons (text_a, text_b, user_id, hashed_ip)
      VALUES (${encryptIfOwner(text_a, owner)}, ${encryptIfOwner(text_b, owner)}, ${userId}, ${hashedIp})
      RETURNING id
    `;
    return NextResponse.json({ id: comparison.id });
  } catch {
    return internalError();
  }
}