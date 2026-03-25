"use client";
import { useState, useEffect } from "react";

interface LatestButtonProps {
  fetchUrl: string;
  onLoadLatest: (session: unknown) => void;
}

export default function LatestButton({
  fetchUrl,
  onLoadLatest,
}: LatestButtonProps) {
  const [loading, setLoading] = useState(true);
  const [latestSession, setLatestSession] = useState<unknown | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(fetchUrl)
      .then((res) => res.json())
      .then((data) => {
        const sessions = data.sessions || [];
        if (sessions.length > 0) {
          setLatestSession(sessions[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fetchUrl]);

  if (!latestSession) return null;

  return (
    <button
      onClick={() => onLoadLatest(latestSession)}
      disabled={loading || !latestSession}
      className="btn-ghost text-xs py-1 px-3 flex-shrink-0"
      style={{ opacity: loading || !latestSession ? 0.4 : 1 }}
    >
      Latest
    </button>
  );
}
