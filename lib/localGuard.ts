import { NextResponse } from "next/server";

const IS_LOCAL = process.env.NEXT_PUBLIC_LOCAL === "true";

export function requireLocal(): NextResponse | null {
  if (IS_LOCAL) return null;
  return NextResponse.json(
    { error: "This endpoint is only available in local mode" },
    { status: 403 },
  );
}
