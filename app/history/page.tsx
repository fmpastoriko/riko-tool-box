"use client";
import { useState, useCallback } from "react";

interface Comparison {
  id: string;
  text_a: string;
  text_b: string;
  created_at: string;
  lines_added?: number;
  lines_removed?: number;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TextPreview({ text, label }: { text: string; label: string }) {
  const lines = text.split("\n").slice(0, 4);
  const truncated = text.split("\n").length > 4;
  return (
    <div className="min-w-0 flex-1">
      <p className="text-xs font-mono mb-1" style={{ color: "var(--muted)" }}>
        {label}
      </p>
      <div
        className="rounded-lg p-2 font-mono text-xs leading-relaxed overflow-hidden"
        style={{
          background: "var(--bg)",
          border: "1px solid var(--border)",
          color: "var(--secondary)",
        }}
      >
        {lines.map((line, i) => (
          <div key={i} className="truncate">
            {line || " "}
          </div>
        ))}
        {truncated && <div style={{ color: "var(--muted)" }}>…</div>}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const [secret, setSecret] = useState("");
  const [comparisons, setComparisons] = useState<Comparison[] | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async (key: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/compare/history", {
        headers: key ? { "x-history-secret": key } : {},
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setComparisons(data.comparisons);
      setAuthenticated(data.authenticated);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    load(secret);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
      <div>
        <h1
          className="text-2xl sm:text-3xl font-bold"
          style={{ color: "var(--primary)" }}
        >
          Comparison History
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--secondary)" }}>
          All comparisons are auto-saved. Enter the secret key to view full
          content.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-48">
            <label
              className="text-xs font-mono block mb-1"
              style={{ color: "var(--muted)" }}
            >
              Secret key (optional — leave empty to preview)
            </label>
            <input
              type="password"
              placeholder="Enter secret key…"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="input-base"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary whitespace-nowrap"
          >
            {loading ? "Loading…" : comparisons ? "Refresh" : "View History"}
          </button>
        </div>
        {error && (
          <p className="text-xs mt-2" style={{ color: "rgb(239,68,68)" }}>
            {error}
          </p>
        )}
      </form>

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
                Preview mode — content obfuscated
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
              }}
            >
              <button
                onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                className="w-full text-left flex items-center gap-4 flex-wrap"
              >
                <span
                  className="font-mono text-xs px-2 py-0.5 rounded"
                  style={{
                    background: "var(--border)",
                    color: "var(--secondary)",
                  }}
                >
                  {c.id}
                </span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  {formatDate(c.created_at)}
                </span>
                <div className="flex gap-3 ml-auto text-xs font-mono">
                  <span style={{ color: "rgb(239,68,68)" }}>
                    {c.lines_removed ?? c.text_a.split("\n").length}L original
                  </span>
                  <span style={{ color: "rgb(34,197,94)" }}>
                    {c.lines_added ?? c.text_b.split("\n").length}L modified
                  </span>
                </div>
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  {expanded === c.id ? "▲" : "▼"}
                </span>
              </button>

              {expanded === c.id && (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <TextPreview text={c.text_a} label="Original" />
                    <TextPreview text={c.text_b} label="Modified" />
                  </div>
                  {authenticated && (
                    <a
                      href={`/tools/text-compare?a=${encodeURIComponent(c.text_a)}&b=${encodeURIComponent(c.text_b)}`}
                      className="btn-ghost inline-flex text-xs"
                    >
                      Open in Text Compare →
                    </a>
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
