"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/formatDate";

interface Session {
  id: string;
  prompt_label: string;
  files_selected: string | string[];
  created_at: string;
  text_output?: string | null;
  is_own: boolean;
}

export default function CodeBrieferHistoryPage() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/briefer/sessions")
      .then((r) => r.json())
      .then((data) => {
        setSessions(data.sessions);
        setAuthenticated(data.authenticated);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-bold"
            style={{ color: "var(--primary)" }}
          >
            Code Briefer History
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--secondary)" }}>
            All sessions are auto-saved.
          </p>
        </div>
        <Link
          href="/tools/code-briefer"
          className="btn-ghost text-xs py-1 px-3 flex-shrink-0"
        >
          ← Code Briefer
        </Link>
      </div>

      {loading && (
        <p className="text-xs font-mono" style={{ color: "var(--muted)" }}>
          Loading…
        </p>
      )}
      {error && (
        <p className="text-xs" style={{ color: "rgb(239,68,68)" }}>
          {error}
        </p>
      )}

      {sessions && (
        <div className="flex items-center gap-2">
          {authenticated ? (
            <>
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: "rgb(34,197,94)" }}
              />
              <span
                className="text-xs font-mono"
                style={{ color: "rgb(34,197,94)" }}
              >
                Authenticated — showing real content
              </span>
            </>
          ) : (
            <>
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: "var(--muted)" }}
              />
              <span
                className="text-xs font-mono"
                style={{ color: "var(--muted)" }}
              >
                Showing your sessions — others are hidden
              </span>
            </>
          )}
          <span
            className="text-xs font-mono ml-auto"
            style={{ color: "var(--muted)" }}
          >
            {sessions.length} session{sessions.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {sessions && sessions.length === 0 && (
        <div
          className="rounded-xl py-14 text-center text-sm"
          style={{ border: "1px dashed var(--border)", color: "var(--muted)" }}
        >
          No sessions saved yet
        </div>
      )}

      {sessions && sessions.length > 0 && (
        <div className="space-y-3">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="card"
              style={{
                borderColor:
                  expanded === s.id ? "var(--accent)" : "var(--border)",
                opacity: s.is_own ? 1 : 0.4,
              }}
            >
              <button
                onClick={() =>
                  s.is_own && setExpanded(expanded === s.id ? null : s.id)
                }
                className="w-full text-left flex items-center gap-4 flex-wrap"
                disabled={!s.is_own}
              >
                <span
                  className="font-mono text-xs px-2 py-0.5 rounded"
                  style={{
                    background: "var(--border)",
                    color: "var(--secondary)",
                  }}
                >
                  {s.id.slice(0, 8)}…
                </span>
                <span
                  className="font-mono text-xs"
                  style={{ color: s.is_own ? "var(--accent)" : "var(--muted)" }}
                >
                  {s.prompt_label}
                </span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  {formatDate(s.created_at)}
                </span>
                {s.is_own && (
                  <>
                    <span
                      className="text-xs ml-auto font-mono"
                      style={{ color: "var(--muted)" }}
                    >
                      {typeof s.files_selected === "string"
                        ? s.files_selected
                        : `${s.files_selected.length} file(s)`}
                    </span>
                    <span className="text-xs" style={{ color: "var(--muted)" }}>
                      {expanded === s.id ? "▲" : "▼"}
                    </span>
                  </>
                )}
              </button>
              {expanded === s.id && s.is_own && (
                <div className="mt-4">
                  {s.text_output ? (
                    <pre
                      className="text-xs font-mono p-3 rounded-lg overflow-auto"
                      style={{
                        background: "var(--bg)",
                        border: "1px solid var(--border)",
                        color: "var(--secondary)",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        maxHeight: 480,
                      }}
                    >
                      {s.text_output}
                    </pre>
                  ) : (
                    <p
                      className="text-xs font-mono"
                      style={{ color: "var(--muted)" }}
                    >
                      No output saved for this session.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
