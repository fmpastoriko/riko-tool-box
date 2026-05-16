"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") return <div className="w-9 h-9" />;

  if (!session) {
    return (
      <button
        onClick={() => signIn("google")}
        className="btn-ghost text-xs px-3 py-1.5"
      >
        Sign in
      </button>
    );
  }

  const isOwner = session.user?.email === process.env.NEXT_PUBLIC_OWNER_EMAIL;

  return (
    <div className="flex items-center gap-2">
      <span
        className="hidden sm:block text-xs font-mono px-2 py-0.5 rounded"
        style={{
          background: isOwner ? "var(--accent-dim)" : "var(--border)",
          color: isOwner ? "var(--accent)" : "var(--secondary)",
        }}
      >
        {isOwner ? "owner" : session.user?.email?.split("@")[0]}
      </span>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="btn-ghost text-xs px-3 py-1.5"
      >
        Sign out
      </button>
    </div>
  );
}
