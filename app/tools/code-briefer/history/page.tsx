"use client";

import HistoryPageLayout from "@/components/HistoryPageLayout";
import StatusBadge from "@/components/StatusBadge";
import MonoText from "@/components/MonoText";

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
      fetchUrl="/api/code-briefer/sessions"
      dataKey="sessions"
      countLabel={(n) => `${n} session${n !== 1 ? "s" : ""}`}
      renderCardMeta={(s) => (
        <>
          <StatusBadge variant="accent">{s.prompt_label}</StatusBadge>
          <MonoText color="muted" className="ml-auto">
            {typeof s.files_selected === "string"
              ? s.files_selected
              : `${s.files_selected.length} file(s)`}
          </MonoText>
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
          <MonoText color="muted">No output saved for this session.</MonoText>
        )
      }
    />
  );
}
