"use client";

import { useMemo, useState } from "react";
import { formatSize } from "@/lib/fileUtils";
import MonoText from "@/components/MonoText";

type FileEntry = { path: string; size: number };

interface FileTreeBaseProps {
  files: FileEntry[];
  selected: Set<string>;
  onToggle: (p: string) => void;
  locked?: Set<string>;
  smartSelected?: Set<string>;
  onRenamePath?: (oldPath: string, newPath: string) => void;
}

export default function FileTreeBase({
  files,
  selected,
  onToggle,
  locked = new Set(),
  smartSelected = new Set(),
  onRenamePath,
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
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  function toggleDir(dir: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(dir) ? next.delete(dir) : next.add(dir);
      return next;
    });
  }

  function startEdit(path: string) {
    setEditingPath(path);
    setEditValue(path);
  }

  function confirmEdit(oldPath: string) {
    const newPath = editValue.trim();
    if (newPath && newPath !== oldPath && onRenamePath) {
      onRenamePath(oldPath, newPath);
    }
    setEditingPath(null);
    setEditValue("");
  }

  if (files.length === 0) {
    return (
      <MonoText color="muted" className="py-4 text-center">
        No files match current filters
      </MonoText>
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
                const isEditing = editingPath === f.path;

                return (
                  <div
                    key={f.path}
                    className="w-full flex items-center gap-2 px-2 py-0.5 rounded text-xs font-mono transition-all"
                    style={{
                      background: isSelected
                        ? "var(--accent-dim)"
                        : "transparent",
                    }}
                  >
                    <button
                      onClick={() =>
                        !isLocked && !isEditing && onToggle(f.path)
                      }
                      disabled={isLocked || isEditing}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                      style={{
                        color: isSelected
                          ? "var(--primary)"
                          : "var(--secondary)",
                        cursor: isLocked || isEditing ? "default" : "pointer",
                      }}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          className="input-base text-xs flex-1 min-w-0"
                          style={{ height: 20, padding: "0 4px", fontSize: 11 }}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") confirmEdit(f.path);
                            if (e.key === "Escape") setEditingPath(null);
                          }}
                        />
                      ) : (
                        <span className="flex-1 truncate">
                          {f.path.split("/").pop()}
                          {onRenamePath && !isEditing && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                startEdit(f.path);
                              }}
                              className="text-base flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity px-0.5"
                              style={{
                                color: "var(--secondary)",
                                lineHeight: 1,
                                cursor: "pointer",
                              }}
                            >
                              ✎
                            </span>
                          )}
                        </span>
                      )}
                      {!isEditing && (
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
                            <svg
                              width="8"
                              height="8"
                              viewBox="0 0 8 8"
                              fill="none"
                            >
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
                      )}
                    </button>

                    {isEditing && (
                      <button
                        onClick={() => confirmEdit(f.path)}
                        className="text-xs flex-shrink-0 px-1.5 py-0.5 rounded"
                        style={{ background: "var(--accent)", color: "#fff" }}
                      >
                        ✓
                      </button>
                    )}

                    {isSmart && !isSelected && !isEditing && (
                      <span
                        className="text-xs px-1 rounded flex-shrink-0"
                        style={{
                          background: "rgba(109,87,248,0.15)",
                          color: "var(--accent)",
                        }}
                      >
                        AI
                      </span>
                    )}
                    {isLocked && !isEditing && (
                      <span
                        className="text-xs flex-shrink-0"
                        style={{ color: "var(--muted)" }}
                      >
                        🔒
                      </span>
                    )}
                    {!isEditing && (
                      <span
                        className="flex-shrink-0"
                        style={{ color: "var(--muted)" }}
                      >
                        {formatSize(f.size)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
