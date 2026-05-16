import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";

export function internalError() {
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export function prettifiedResponse(prettified: boolean) {
  return NextResponse.json({ ok: true, prettified });
}

export function requireAuth(req: NextRequest): NextResponse | null {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
