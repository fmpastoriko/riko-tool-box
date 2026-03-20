import { NextRequest } from "next/server";
import { getIp } from "@/lib/ip";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60_000;

export function checkRateLimit(
  req: NextRequest,
  maxPerWindow: number,
): { allowed: boolean; remaining: number } {
  const ip = getIp(req);
  const now = Date.now();
  const entry = store.get(ip);
  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: maxPerWindow - 1 };
  }
  if (entry.count >= maxPerWindow) {
    return { allowed: false, remaining: 0 };
  }
  entry.count++;
  return { allowed: true, remaining: maxPerWindow - entry.count };
}
