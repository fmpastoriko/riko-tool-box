"use client";

interface OutputPanelProps {
  output: string;
  tokenCount: number;
  copied: boolean;
  joinedFiles: { path: string; content: string }[];
  fullContextFiles: Set<string>;
  allExpanded: boolean;
  templates: { id: string; label: string }[];
  selectedTemplates: Set<string>;
  onCopy: () => void;
  onDownload: () => void;
  onToggleFullContext: (path: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onChange: (value: string) => void;
}

export default function OutputPanel({
  output,
  tokenCount,
  copied,
  joinedFiles,
  fullContextFiles,
  allExpanded,
  onCopy,
  onDownload,
  onToggleFullContext,
  onExpandAll,
  onCollapseAll,
  onChange,
}: OutputPanelProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0 card gap-2">
      <div className="flex items-center justify-between flex-shrink-0 flex-wrap gap-1">
        <p className="section-label mb-0">Output</p>
        <div className="flex items-center gap-1.5">
          {output && (
            <span
              className="text-xs font-mono"
              style={{ color: "var(--muted)" }}
            >
              ~{tokenCount.toLocaleString()} tokens
            </span>
          )}
          {output && (
            <button
              onClick={onCopy}
              className="btn-ghost text-xs py-0.5 px-1.5"
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
          )}
          {output && (
            <button
              onClick={onDownload}
              className="btn-ghost text-xs py-0.5 px-1.5"
            >
              ↓
            </button>
          )}
          {joinedFiles.length > 0 && (
            <button
              onClick={allExpanded ? onCollapseAll : onExpandAll}
              className="btn-ghost text-xs py-0.5 px-1.5"
            >
              {allExpanded ? "Collapse all" : "Expand all"}
            </button>
          )}
        </div>
      </div>

      {joinedFiles.length > 0 && (
        <>
          <div
            className="flex flex-wrap gap-1 flex-shrink-0 overflow-y-auto"
            style={{ maxHeight: "4.5rem" }}
          >
            {joinedFiles.map((f) => {
              const isFull = fullContextFiles.has(f.path);
              return (
                <button
                  key={f.path}
                  onClick={() => onToggleFullContext(f.path)}
                  className="text-xs font-mono px-1.5 py-0.5 rounded border transition-all flex items-center gap-1"
                  style={{
                    borderColor: isFull ? "var(--accent)" : "var(--border)",
                    background: isFull ? "var(--accent-dim)" : "var(--bg)",
                    color: isFull ? "var(--accent)" : "var(--secondary)",
                    alignSelf: "flex-start",
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-sm"
                    style={{
                      background: isFull ? "var(--accent)" : "var(--border)",
                    }}
                  />
                  {f.path.split("/").pop()}
                </button>
              );
            })}
          </div>
          <p
            className="text-xs flex-shrink-0"
            style={{ color: "var(--muted)" }}
          >
            Click a file to toggle full context for that file.
          </p>
        </>
      )}

      <textarea
        value={output}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 w-full font-mono text-xs leading-relaxed resize-none focus:outline-none overflow-y-auto"
        placeholder="Output will appear here after Join…"
        style={{ background: "transparent", color: "var(--secondary)" }}
      />
    </div>
  );
}
