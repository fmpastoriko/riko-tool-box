"use client";

import { useState } from "react";
import MarkdownContent from "@/components/MarkdownContent";
import PanelBox from "@/components/PanelBox";
import { markdownStyles } from "@/components/chatbot/MessageBubble";
import type { ModelInfo } from "@/components/chatbot/types";
import StatusBadge from "@/components/StatusBadge";

interface LlmSuggestionPanelProps {
  llmSuggestion: string;
  llmSkippedReason: string;
  llmStreaming: boolean;
  llmCopied: boolean;
  modelUsed: string;
  models: ModelInfo[];
  selectedModel: string;
  applying: boolean;
  applyResults: {
    file: string;
    ok: boolean;
    prettified?: boolean;
    error: string;
  }[];
  chatSessionId: string | null;
  canApply: boolean;
  llmRef: React.RefObject<HTMLTextAreaElement | null>;
  onModelChange: (model: string) => void;
  onStop: () => void;
  onRetry: () => void;
  onCopy: () => void;
  onRunAnyway: () => void;
  onApply: (revert: boolean) => void;
  onChange: (value: string) => void;
}

export default function LlmSuggestionPanel({
  llmSuggestion,
  llmSkippedReason,
  llmStreaming,
  llmCopied,
  modelUsed,
  models,
  selectedModel,
  applying,
  applyResults,
  chatSessionId,
  canApply,
  llmRef,
  onModelChange,
  onStop,
  onRetry,
  onCopy,
  onRunAnyway,
  onApply,
  onChange,
}: LlmSuggestionPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [revert, setRevert] = useState(false);

  const allModelsExhausted =
    models.length > 0 && models.every((m) => m.exhausted);
  const showContent = !llmSkippedReason || llmSuggestion;
  const thinkingModel = modelUsed || selectedModel || "LLM";

  const headerRight = (
    <>
      <style>{markdownStyles}</style>
      {models.length > 0 && (
        <select
          className="input-base text-xs py-0.5 flex-shrink-0"
          style={{ height: 24, padding: "0 6px", fontSize: 11, width: 120 }}
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
        >
          <option value="">LLM Model: Auto</option>
          {models.map((m) => (
            <option key={m.name} value={m.name} disabled={m.exhausted}>
              {m.exhausted ? `${m.name} (exhausted)` : m.name}
            </option>
          ))}
        </select>
      )}
      {allModelsExhausted && (
        <StatusBadge variant="error">No models available</StatusBadge>
      )}
      {modelUsed && !llmStreaming && (
        <StatusBadge
          variant="accent"
          style={{
            maxWidth: 100,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: "inline-block",
          }}
        >
          {modelUsed}
        </StatusBadge>
      )}
      {llmStreaming && (
        <span
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ background: "var(--accent)" }}
        />
      )}
      {llmStreaming && (
        <button
          onClick={onStop}
          className="btn-ghost text-xs py-0.5 px-1.5"
          style={{ color: "rgb(239,68,68)", borderColor: "rgb(239,68,68)" }}
        >
          ✕ Stop
        </button>
      )}
      {llmSuggestion && !llmStreaming && (
        <>
          <button
            onClick={() => setIsEditing((v) => !v)}
            className="btn-ghost text-xs py-0.5 px-1.5"
            style={
              isEditing
                ? { color: "var(--accent)", borderColor: "var(--accent)" }
                : {}
            }
          >
            Edit
          </button>
          <button onClick={onRetry} className="btn-ghost text-xs py-0.5 px-1.5">
            ↺
          </button>
          <button onClick={onCopy} className="btn-ghost text-xs py-0.5 px-1.5">
            {llmCopied ? "✓" : "Copy"}
          </button>
          {chatSessionId && (
            <button
              onClick={() =>
                window.open(`/tools/chatbot?session=${chatSessionId}`, "_blank")
              }
              className="btn-ghost text-xs py-0.5 px-1.5"
            >
              Chat ↗
            </button>
          )}
          {canApply && (
            <>
              <button
                onClick={() => onApply(revert)}
                disabled={applying}
                className="btn-primary text-xs py-0.5 px-1.5"
                style={{ opacity: applying ? 0.6 : 1 }}
              >
                {applying ? "Applying…" : revert ? "↩ Revert" : "Apply"}
              </button>
              <button
                onClick={() => setRevert((r) => !r)}
                className="btn-ghost text-xs py-0.5 px-1.5"
                style={
                  revert
                    ? { color: "var(--accent)", borderColor: "var(--accent)" }
                    : {}
                }
              >
                ↩
              </button>
            </>
          )}
        </>
      )}
      {llmSkippedReason && !llmStreaming && !llmSuggestion && (
        <button
          onClick={onRunAnyway}
          className="btn-ghost text-xs py-0.5 px-1.5"
        >
          Run anyway
        </button>
      )}
    </>
  );

  return (
    <PanelBox title="LLM Suggestion" headerRight={headerRight}>
      {!showContent ? (
        <p className="text-xs font-mono" style={{ color: "var(--muted)" }}>
          {llmSkippedReason}
        </p>
      ) : !isEditing && llmSuggestion ? (
        <div
          className="flex-1 overflow-y-auto text-sm leading-relaxed markdown-body"
          style={{ color: "var(--secondary)" }}
        >
          <MarkdownContent text={llmSuggestion} />
        </div>
      ) : (
        <textarea
          ref={llmRef}
          value={llmSuggestion}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 font-mono text-xs leading-relaxed w-full resize-none focus:outline-none overflow-y-auto"
          style={{
            color: "var(--secondary)",
            background: "transparent",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
          readOnly={llmStreaming}
          placeholder={
            llmStreaming
              ? `${thinkingModel} is thinking...`
              : "LLM suggestion will appear here after Join…"
          }
        />
      )}

      {applyResults.length > 0 && (
        <div className="space-y-0.5 flex-shrink-0">
          {applyResults.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-xs font-mono">
              <span
                style={{ color: r.ok ? "rgb(34,197,94)" : "rgb(239,68,68)" }}
              >
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
      )}
    </PanelBox>
  );
}
