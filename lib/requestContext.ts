import { NextRequest } from "next/server";
import { getServerRole, isOwnerRole } from "@/lib/session";
import { sha256 } from "@/lib/auth";
import { getIp } from "@/lib/ip";

export async function getRequestContext(req: NextRequest) {
  const role = await getServerRole();
  const owner = isOwnerRole(role);
  const hashedIp = sha256(getIp(req));
  const ownerUserId = process.env.OWNER_EMAIL ?? null;
  return { role, owner, hashedIp, ownerUserId };
}
