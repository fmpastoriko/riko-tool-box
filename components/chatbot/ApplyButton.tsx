"use client";

import { useState } from "react";
import { parseSuggestion } from "@/lib/parseSuggestion";

export default function ApplyButton({
  content,
  repoPath,
}: {
  content: string;
  repoPath: string;
}) {
  const blocks = parseSuggestion(content);
  const [results, setResults] = useState<
    { file: string; ok: boolean; prettified?: boolean; error?: string }[]
  >([]);
  const [applying, setApplying] = useState(false);

  if (blocks.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      <button
        onClick={async () => {
          setApplying(true);
          setResults([]);
          const res: {
            file: string;
            ok: boolean;
            prettified?: boolean;
            error?: string;
          }[] = [];
          for (const block of blocks) {
            try {
              const r = await fetch("/api/briefer/apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  repoPath,
                  filePath: block.filePath,
                  from: block.from,
                  to: block.to,
                }),
              });
              const d = await r.json();
              res.push({
                file: block.filePath,
                ok: !!d.ok,
                prettified: d.prettified,
                error: d.error,
              });
            } catch (e) {
              res.push({ file: block.filePath, ok: false, error: String(e) });
            }
          }
          setResults(res);
          setApplying(false);
        }}
        disabled={applying}
        className="btn-primary text-xs py-1 px-3"
        style={{ opacity: applying ? 0.6 : 1 }}
      >
        {applying ? "Applying…" : "⚡ Apply Changes"}
      </button>

      {results.map((r, i) => (
        <div key={i} className="flex items-center gap-2 text-xs font-mono">
          <span style={{ color: r.ok ? "rgb(34,197,94)" : "rgb(239,68,68)" }}>
            {r.ok ? "✓" : "✕"}
          </span>
          <span style={{ color: "var(--secondary)" }}>{r.file}</span>
          {r.ok && r.prettified && (
            <span style={{ color: "var(--muted)" }}>prettier ✓</span>
          )}
          {r.error && (
            <span style={{ color: "rgb(239,68,68)" }}>{r.error}</span>
          )}
        </div>
      ))}
    </div>
  );
}
