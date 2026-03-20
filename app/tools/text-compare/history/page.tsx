"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/formatDate";

interface Comparison {
  id: string;
  text_a: string;
  text_b: string;
  created_at: string;
  is_own: boolean;
}

function TextPreview({ text }: { text: string }) {
  const lines = text.split("\n");
  const truncated = lines.slice(0, 3).join("\n");
  return (
    <pre
      className="text-xs font-mono p-2 rounded-lg"
      style={{
        background: "var(--bg)",
        border: "1px solid var(--border)",
        color: "var(--secondary)",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {truncated}
      {lines.length > 3 && (
        <span style={{ color: "var(--muted)" }}>
          {"\n"}…{lines.length - 3} more line(s)
        </span>
      )}
    </pre>
  );
}

export default function TextCompareHistoryPage() {
  const [comparisons, setComparisons] = useState<Comparison[] | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/compare/history")
      .then((r) => r.json())
      .then((data) => {
        setComparisons(data.comparisons);
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
            Text Compare History
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--secondary)" }}>
            All comparisons are auto-saved.
          </p>
        </div>
        <Link
          href="/tools/text-compare"
          className="btn-ghost text-xs py-1 px-3 flex-shrink-0"
        >
          ← Text Compare
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

      {comparisons && (
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
                Showing your comparisons — others are hidden
              </span>
            </>
          )}
          <span
            className="text-xs font-mono ml-auto"
            style={{ color: "var(--muted)" }}
          >
            {comparisons.length} comparison{comparisons.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {comparisons && comparisons.length === 0 && (
        <div
          className="rounded-xl py-14 text-center text-sm"
          style={{ border: "1px dashed var(--border)", color: "var(--muted)" }}
        >
          No comparisons saved yet
        </div>
      )}

      {comparisons && comparisons.length > 0 && (
        <div className="space-y-3">
          {comparisons.map((c) => (
            <div
              key={c.id}
              className="card"
              style={{
                borderColor:
                  expanded === c.id ? "var(--accent)" : "var(--border)",
                opacity: c.is_own ? 1 : 0.4,
              }}
            >
              <button
                onClick={() =>
                  c.is_own && setExpanded(expanded === c.id ? null : c.id)
                }
                className="w-full text-left flex items-center gap-4 flex-wrap"
                disabled={!c.is_own}
              >
                <span
                  className="font-mono text-xs px-2 py-0.5 rounded"
                  style={{
                    background: "var(--border)",
                    color: "var(--secondary)",
                  }}
                >
                  {c.id.slice(0, 8)}…
                </span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  {formatDate(c.created_at)}
                </span>
                {c.is_own && (
                  <>
                    <span
                      className="text-xs font-mono ml-auto"
                      style={{ color: "var(--muted)" }}
                    >
                      {c.text_a.split("\n").length} /{" "}
                      {c.text_b.split("\n").length} lines
                    </span>
                    <span className="text-xs" style={{ color: "var(--muted)" }}>
                      {expanded === c.id ? "▲" : "▼"}
                    </span>
                  </>
                )}
              </button>
              {expanded === c.id && c.is_own && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p
                      className="text-xs font-mono mb-1"
                      style={{ color: "var(--muted)" }}
                    >
                      First Text
                    </p>
                    <TextPreview text={c.text_a} />
                  </div>
                  <div>
                    <p
                      className="text-xs font-mono mb-1"
                      style={{ color: "var(--muted)" }}
                    >
                      Second Text
                    </p>
                    <TextPreview text={c.text_b} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
