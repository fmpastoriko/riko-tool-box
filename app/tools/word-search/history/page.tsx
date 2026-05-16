"use client";

import { useState } from "react";
import HistoryPageLayout from "@/components/HistoryPageLayout";
import { downloadBlob } from "@/lib/downloadPdf";
import StatusBadge from "@/components/StatusBadge";
import MonoText from "@/components/MonoText";

interface Session {
  id: string;
  topic: string;
  options_json: string;
  puzzles_json: string;
  created_at: string;
  is_own: boolean;
}

export default function WordSearchHistoryPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleRedownload = async (s: Session) => {
    setDownloading(s.id);
    try {
      const puzzles = JSON.parse(s.puzzles_json);
      const res = await fetch("/api/word-search/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puzzles }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      downloadBlob(blob, "word-search.pdf");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <HistoryPageLayout<Session>
      title="Word Search History"
      subtitle="All generated puzzles are auto-saved."
      backHref="/tools/word-search"
      backLabel="← Word Search"
      fetchUrl="/api/word-search/sessions"
      dataKey="sessions"
      countLabel={(n) => `${n} session${n !== 1 ? "s" : ""}`}
      renderCardMeta={(s) => {
        const opts = JSON.parse(s.options_json);
        return (
          <>
            <StatusBadge variant="accent">{s.topic}</StatusBadge>
            <MonoText color="muted" className="ml-auto">
              {opts.wordCount} words · {opts.gridSize}×{opts.gridSize}
            </MonoText>
          </>
        );
      }}
      renderExpanded={(s) => (
        <div className="flex flex-col gap-2">
          <MonoText color="secondary">
            {JSON.parse(s.puzzles_json).length} puzzle(s) saved.
          </MonoText>
          <button
            onClick={() => handleRedownload(s)}
            disabled={downloading === s.id}
            className="btn-ghost text-xs self-start"
            style={{ color: "var(--accent)" }}
          >
            {downloading === s.id ? "Preparing..." : "Re-download PDF"}
          </button>
        </div>
      )}
    />
  );
}
