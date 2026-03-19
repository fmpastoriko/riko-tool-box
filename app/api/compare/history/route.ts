import { NextRequest, NextResponse } from "next/server";
import { neonDb } from "@/lib/db";
import { getServerRole, isOwnerRole } from "@/lib/session";
import { decrypt } from "@/lib/encrypt";
import { sha256 } from "@/lib/auth";
import { getIp } from "@/lib/ip";

export async function GET(req: NextRequest) {
  try {
    const role = await getServerRole();
    const owner = isOwnerRole(role);
    const hashedIp = sha256(getIp(req));

    const rows = await neonDb`
      SELECT id, text_a, text_b, created_at, hashed_ip
      FROM comparisons
      ORDER BY created_at DESC
      LIMIT 100
    `;

    const comparisons = rows.map((row) => {
      const isOwn = owner || row.hashed_ip === hashedIp;
      if (isOwn) {
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
  } catch (e) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
