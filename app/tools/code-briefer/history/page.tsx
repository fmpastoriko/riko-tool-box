"use client";

import HistoryPageLayout from "@/components/HistoryPageLayout";

interface Session {
  id: string;
  prompt_label: string;
  files_selected: string | string[];
  created_at: string;
  text_output?: string | null;
  is_own: boolean;
}

export default function CodeBrieferHistoryPage() {
  return (
    <HistoryPageLayout<Session>
      title="Code Briefer History"
      subtitle="All sessions are auto-saved."
      backHref="/tools/code-briefer"
      backLabel="← Code Briefer"
      fetchUrl="/api/briefer/sessions"
      dataKey="sessions"
      countLabel={(n) => `${n} session${n !== 1 ? "s" : ""}`}
      renderCardMeta={(s) => (
        <>
          <span
            className="font-mono text-xs"
            style={{ color: "var(--accent)" }}
          >
            {s.prompt_label}
          </span>
          <span
            className="text-xs font-mono ml-auto"
            style={{ color: "var(--muted)" }}
          >
            {typeof s.files_selected === "string"
              ? s.files_selected
              : `${s.files_selected.length} file(s)`}
          </span>
        </>
      )}
      renderExpanded={(s) =>
        s.text_output ? (
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
          <p className="text-xs font-mono" style={{ color: "var(--muted)" }}>
            No output saved for this session.
          </p>
        )
      }
    />
  );
}
