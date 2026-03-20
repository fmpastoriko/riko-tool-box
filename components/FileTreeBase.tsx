"use client";

import { useMemo, useState } from "react";
import { formatSize } from "@/lib/fileUtils";

type FileEntry = { path: string; size: number };

interface FileTreeBaseProps {
  files: FileEntry[];
  selected: Set<string>;
  onToggle: (p: string) => void;
  locked?: Set<string>;
  smartSelected?: Set<string>;
}

export default function FileTreeBase({
  files,
  selected,
  onToggle,
  locked = new Set(),
  smartSelected = new Set(),
}: FileTreeBaseProps) {
  const grouped = useMemo(() => {
    const dirs = new Map<string, FileEntry[]>();
    for (const f of files) {
      const dir = f.path.includes("/")
        ? f.path.split("/").slice(0, -1).join("/")
        : "(root)";
      if (!dirs.has(dir)) dirs.set(dir, []);
      dirs.get(dir)!.push(f);
    }
    return dirs;
  }, [files]);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggleDir(dir: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(dir) ? next.delete(dir) : next.add(dir);
      return next;
    });
  }

  if (files.length === 0) {
    return (
      <div
        className="text-xs font-mono py-4 text-center"
        style={{ color: "var(--muted)" }}
      >
        No files match current filters
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {Array.from(grouped.entries()).map(([dir, dirFiles]) => (
        <div key={dir}>
          <button
            onClick={() => toggleDir(dir)}
            className="w-full text-left flex items-center gap-1.5 px-1 py-0.5 rounded text-xs font-mono transition-colors"
            style={{ color: "var(--muted)" }}
          >
            <span>{collapsed.has(dir) ? "▶" : "▼"}</span>
            <span>{dir}/</span>
            <span className="ml-auto" style={{ color: "var(--border)" }}>
              {dirFiles.filter((f) => selected.has(f.path)).length}/
              {dirFiles.length}
            </span>
          </button>

          {!collapsed.has(dir) && (
            <div className="ml-3 space-y-0.5">
              {dirFiles.map((f) => {
                const isSelected = selected.has(f.path);
                const isLocked = locked.has(f.path);
                const isSmart = smartSelected.has(f.path);

                return (
                  <button
                    key={f.path}
                    onClick={() => onToggle(f.path)}
                    disabled={isLocked}
                    className="w-full text-left flex items-center gap-2 px-2 py-0.5 rounded text-xs font-mono transition-all"
                    style={{
                      background: isSelected
                        ? "var(--accent-dim)"
                        : "transparent",
                      color: isSelected ? "var(--primary)" : "var(--secondary)",
                      cursor: isLocked ? "default" : "pointer",
                    }}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center"
                      style={{
                        borderColor: isSelected
                          ? "var(--accent)"
                          : "var(--border)",
                        background: isSelected
                          ? "var(--accent)"
                          : "transparent",
                      }}
                    >
                      {isSelected && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path
                            d="M1 4l2 2 4-4"
                            stroke="#fff"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="flex-1 truncate">
                      {f.path.split("/").pop()}
                    </span>
                    {isSmart && !isSelected && (
                      <span
                        className="text-xs px-1 rounded"
                        style={{
                          background: "rgba(109,87,248,0.15)",
                          color: "var(--accent)",
                        }}
                      >
                        AI
                      </span>
                    )}
                    {isLocked && (
                      <span
                        className="text-xs"
                        style={{ color: "var(--muted)" }}
                      >
                        🔒
                      </span>
                    )}
                    <span style={{ color: "var(--muted)" }}>
                      {formatSize(f.size)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
