import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export type Role = "owner" | "unauthenticated";

export async function getServerRole(): Promise<Role> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return "unauthenticated";
  if (session.user.email === process.env.OWNER_EMAIL) return "owner";
  return "unauthenticated";
}

export async function getServerUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { sub?: string })?.sub ?? null;
}

export function isOwnerRole(role: Role): boolean {
  return role === "owner";
}
