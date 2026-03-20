"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { markdownStyles } from "@/components/chatbot/MessageBubble";
import type { ModelInfo } from "@/components/chatbot/types";

interface LlmSuggestionPanelProps {
  llmSuggestion: string;
  llmSkippedReason: string;
  llmStreaming: boolean;
  llmCopied: boolean;
  modelUsed: string;
  models: ModelInfo[];
  selectedModel: string;
  applying: boolean;
  applyResults: { file: string; ok: boolean; error?: string }[];
  chatSessionId: string | null;
  canApply: boolean;
  llmRef: React.RefObject<HTMLTextAreaElement | null>;
  onModelChange: (model: string) => void;
  onStop: () => void;
  onRetry: () => void;
  onCopy: () => void;
  onRunAnyway: () => void;
  onApply: () => void;
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

  const allModelsExhausted =
    models.length > 0 && models.every((m) => m.exhausted);

  const showContent = !llmSkippedReason || llmSuggestion;

  const thinkingModel = modelUsed || selectedModel || "LLM";

  return (
    <div className="flex-1 flex flex-col min-h-0 card gap-2">
      <style>{markdownStyles}</style>
      <div className="flex items-center justify-between flex-shrink-0 gap-1">
        <p className="section-label mb-0">LLM Suggestion</p>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
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
            <span
              className="text-xs font-mono px-1.5 py-0.5 rounded"
              style={{
                background: "rgba(239,68,68,0.1)",
                color: "rgb(239,68,68)",
              }}
            >
              No models available
            </span>
          )}
          {modelUsed && !llmStreaming && (
            <span
              className="text-xs font-mono px-1.5 py-0.5 rounded"
              style={{
                background: "var(--accent-dim)",
                color: "var(--accent)",
                maxWidth: 100,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "inline-block",
              }}
            >
              {modelUsed}
            </span>
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
              <button
                onClick={onRetry}
                className="btn-ghost text-xs py-0.5 px-1.5"
              >
                ↺
              </button>
              <button
                onClick={onCopy}
                className="btn-ghost text-xs py-0.5 px-1.5"
              >
                {llmCopied ? "✓" : "Copy"}
              </button>
              {chatSessionId && (
                <button
                  onClick={() =>
                    window.open(
                      `/tools/chatbot?session=${chatSessionId}`,
                      "_blank",
                    )
                  }
                  className="btn-ghost text-xs py-0.5 px-1.5"
                >
                  Chat ↗
                </button>
              )}
              {canApply && (
                <button
                  onClick={onApply}
                  disabled={applying}
                  className="btn-primary text-xs py-0.5 px-1.5"
                  style={{ opacity: applying ? 0.6 : 1 }}
                >
                  {applying ? "Applying…" : "Apply"}
                </button>
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
        </div>
      </div>

      {!showContent ? (
        <p className="text-xs font-mono" style={{ color: "var(--muted)" }}>
          {llmSkippedReason}
        </p>
      ) : !isEditing && llmSuggestion ? (
        <div
          className="flex-1 overflow-y-auto text-sm leading-relaxed markdown-body"
          style={{ color: "var(--secondary)" }}
        >
          <ReactMarkdown
            components={{
              code: ({ className, children }) => {
                const isBlock = String(children).includes("\n");
                return isBlock ? (
                  <pre
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      padding: "8px 10px",
                      overflowX: "auto",
                      margin: "6px 0",
                      fontSize: 12,
                      fontFamily: "monospace",
                      lineHeight: 1.5,
                    }}
                  >
                    <code
                      className={className}
                      style={{ fontFamily: "monospace" }}
                    >
                      {children}
                    </code>
                  </pre>
                ) : (
                  <code
                    style={{
                      background: "var(--border)",
                      borderRadius: 3,
                      padding: "1px 4px",
                      fontSize: 12,
                      fontFamily: "monospace",
                    }}
                  >
                    {children}
                  </code>
                );
              },
              strong: ({ children }) => (
                <strong style={{ fontWeight: 600 }}>{children}</strong>
              ),
              blockquote: ({ children }) => (
                <blockquote
                  style={{
                    borderLeft: "2px solid var(--accent)",
                    paddingLeft: 10,
                    margin: "4px 0",
                    color: "var(--muted)",
                    fontStyle: "italic",
                  }}
                >
                  {children}
                </blockquote>
              ),
            }}
          >
            {llmSuggestion}
          </ReactMarkdown>
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
              {r.error && (
                <span style={{ color: "rgb(239,68,68)" }}>{r.error}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
