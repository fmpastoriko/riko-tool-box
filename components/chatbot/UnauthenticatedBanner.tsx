"use client";

import { signIn } from "next-auth/react";

export default function UnauthenticatedBanner({
  hasMessages,
}: {
  hasMessages: boolean;
}) {
  return (
    <div
      className="rounded-xl px-4 py-3 flex items-center justify-between gap-4 flex-wrap flex-shrink-0"
      style={{
        background: "var(--accent-dim)",
        border: "1px solid var(--accent)",
      }}
    >
      <p className="text-xs font-mono" style={{ color: "var(--accent)" }}>
        {hasMessages
          ? "You're not signed in — your chat is tied to your IP."
          : "Sign in to keep your chat history privately."}
      </p>
      <button
        onClick={() => signIn("google")}
        className="btn-primary text-xs py-1 px-3 flex-shrink-0"
      >
        Sign in with Google
      </button>
    </div>
  );
}
