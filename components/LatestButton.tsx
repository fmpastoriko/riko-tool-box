"use client";
import { useState } from "react";

interface LatestButtonProps {
  fetchUrl: string;
  onLoadLatest: (session: unknown) => void;
}

export default function LatestButton({
  fetchUrl,
  onLoadLatest,
}: LatestButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch(fetchUrl);
      const data = await res.json();
      const sessions = data.sessions || [];
      if (sessions.length > 0) {
        onLoadLatest(sessions[0]);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="btn-ghost text-xs py-1 px-3 flex-shrink-0"
      style={{ opacity: loading ? 0.4 : 1 }}
    >
      {loading ? "Loading…" : "Latest"}
    </button>
  );
}
