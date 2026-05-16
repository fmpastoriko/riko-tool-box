"use client";

import { useState } from "react";
import HistoryPageLayout from "@/components/HistoryPageLayout";
import { downloadBlob } from "@/lib/downloadPdf";
import StatusBadge from "@/components/StatusBadge";
import MonoText from "@/components/MonoText";

interface Session {
  id: string;
  options_json: string;
  puzzles_json: string;
  created_at: string;
  is_own: boolean;
}

export default function ArithmeticPuzzleHistoryPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleRedownload = async (s: Session) => {
    setDownloading(s.id);
    try {
      const puzzles = JSON.parse(s.puzzles_json);
      const res = await fetch("/api/arithmetic-puzzle/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puzzles }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      downloadBlob(blob, "arithmetic-puzzle.pdf");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <HistoryPageLayout<Session>
      title="Arithmetic Puzzle History"
      subtitle="All generated puzzles are auto-saved."
      backHref="/tools/arithmetic-puzzle"
      backLabel="← Arithmetic Puzzle"
      fetchUrl="/api/arithmetic-puzzle/sessions"
      dataKey="sessions"
      countLabel={(n) => `${n} session${n !== 1 ? "s" : ""}`}
      renderCardMeta={(s) => {
        const opts = JSON.parse(s.options_json);
        return (
          <>
            <StatusBadge variant="accent">
              {opts.count} puzzle{opts.count !== 1 ? "s" : ""} ·{" "}
              {opts.difficulty}
            </StatusBadge>
            <MonoText color="muted" className="ml-auto">
              ops {opts.operators?.join("") ?? ""}
            </MonoText>
            <MonoText color="secondary">
              · hide {opts.hideType ?? "operator"}
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
