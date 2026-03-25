"use client";
import type { ChatSession } from "./types";
import Card from "@/components/Card";

export default function SessionList({
  sessions,
  activeSession,
  onSelect,
  onDelete,
}: {
  sessions: ChatSession[];
  activeSession: ChatSession | null;
  onSelect: (s: ChatSession) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
}) {
  return (
    <Card title="Session History" className="flex-1 min-h-0">
      {sessions.length === 0 && (
        <p className="text-xs font-mono px-2" style={{ color: "var(--muted)" }}>
          No sessions yet
        </p>
      )}
      {sessions.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s)}
          className="w-full text-left px-3 py-2 rounded-lg text-xs transition-all group flex items-center justify-between gap-1 flex-shrink-0 font-mono"
          style={{
            background:
              activeSession?.id === s.id ? "var(--accent-dim)" : "transparent",
            border: `1px solid ${activeSession?.id === s.id ? "var(--accent)" : "var(--border)"}`,
            color:
              activeSession?.id === s.id ? "var(--accent)" : "var(--muted)",
          }}
        >
          <span className="truncate flex-1">{s.title}</span>
          <span
            onClick={(e) => onDelete(e, s.id)}
            className="opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity"
            style={{ color: "var(--muted)" }}
          >
            ✕
          </span>
        </button>
      ))}
    </Card>
  );
}
