import { createHash, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function isAuthenticated(req: NextRequest): boolean {
  const secret = req.headers.get("x-history-secret") ?? "";
  const serverHash = process.env.HISTORY_SECRET_HASH ?? "";
  if (!serverHash) return false;
  const a = Buffer.from(sha256(secret));
  const b = Buffer.from(serverHash);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export { getServerRole, getServerUserId, isOwnerRole } from "@/lib/session";
export type { Role } from "@/lib/session";
