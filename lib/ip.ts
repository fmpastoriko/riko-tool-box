import { NextRequest } from "next/server";

export function getIp(req: NextRequest): string {
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return sanitizeIp(realIp);
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const last = forwarded.split(",").at(-1)?.trim();
    if (last) return sanitizeIp(last);
  }
  return "unknown";
}

function sanitizeIp(ip: string): string {
  const clean = ip.trim();
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(clean)) return clean;
  if (/^[0-9a-fA-F:]+$/.test(clean)) return clean;
  return "unknown";
}
