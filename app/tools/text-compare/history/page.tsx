"use client";

import HistoryPageLayout from "@/components/HistoryPageLayout";

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
  return (
    <HistoryPageLayout<Comparison>
      title="Text Compare History"
      subtitle="All comparisons are auto-saved."
      backHref="/tools/text-compare"
      backLabel="← Text Compare"
      fetchUrl="/api/compare"
      dataKey="comparisons"
      countLabel={(n) => `${n} comparison${n !== 1 ? "s" : ""}`}
      renderCardMeta={(c) => (
        <span
          className="text-xs font-mono ml-auto"
          style={{ color: "var(--muted)" }}
        >
          {c.text_a.split("\n").length} / {c.text_b.split("\n").length} lines
        </span>
      )}
      renderExpanded={(c) => (
        <div className="grid grid-cols-2 gap-3">
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
    />
  );
}
