"use client";

import { useState, useEffect, useMemo } from "react";
import { estimateTokens } from "@/lib/fileUtils";
import { summarizeFile } from "@/lib/summarize";
import FileTreeBase from "@/components/FileTreeBase";
import { DEFAULT_EXTS, EXT_GROUPS } from "@/config/fileExtensions";
import Card from "@/components/Card";
import SectionLabel from "@/components/SectionLabel";
import TagButton from "@/components/TagButton";
import ErrorText from "@/components/ErrorText";
import MonoText from "@/components/MonoText";

type FileEntry = { path: string; size: number };

interface RepoFileTreeProps {
  repoPath: string;
  onInject: (
    files: { path: string; content: string }[],
    tokenCount: number,
  ) => void;
  onClose: () => void;
  injectLabel?: string;
  initialSelected?: Set<string>;
}

export default function RepoFileTree({
  repoPath,
  onInject,
  onClose,
  injectLabel = "Inject Context",
  initialSelected = new Set(),
}: RepoFileTreeProps) {
  const [allFiles, setAllFiles] = useState<FileEntry[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(
    new Set(initialSelected),
  );
  const [enabledExts, setEnabledExts] = useState<Set<string>>(
    new Set(DEFAULT_EXTS),
  );
  const [customExts, setCustomExts] = useState("");
  const [loading, setLoading] = useState(true);
  const [injecting, setInjecting] = useState(false);
  const [error, setError] = useState("");

  const activeExts = useMemo(() => {
    const extras = customExts
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean)
      .map((e) => (e.startsWith(".") ? e : `.${e}`));
    return new Set([...enabledExts, ...extras]);
  }, [enabledExts, customExts]);

  const filteredFiles = useMemo(
    () =>
      allFiles.filter((f) => {
        const ext = "." + f.path.split(".").pop()!.toLowerCase();
        return activeExts.has(ext);
      }),
    [allFiles, activeExts],
  );

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/code-briefer/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repoPath }),
        });
        const data = await res.json();
        if (data.error) {
          setError(data.error);
          return;
        }
        setAllFiles(data.files ?? []);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [repoPath]);

  function toggleFile(p: string) {
    if (initialSelected.has(p)) return;
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  }

  function toggleExt(ext: string) {
    setEnabledExts((prev) => {
      const next = new Set(prev);
      next.has(ext) ? next.delete(ext) : next.add(ext);
      return next;
    });
  }

  async function handleInject(summarize = false) {
    if (selectedFiles.size === 0) return;
    setInjecting(true);
    try {
      const res = await fetch("/api/code-briefer/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoPath,
          filePaths: Array.from(selectedFiles),
        }),
      });
      const data = await res.json();
      const files: { path: string; content: string }[] = (data.files ?? [])
        .filter((f: { skipped?: boolean }) => !f.skipped)
        .map((f: { path: string; content: string }) => ({
          path: f.path,
          content: summarize ? summarizeFile(f.path, f.content) : f.content,
        }));
      const tokenCount = estimateTokens(files.map((f) => f.content).join("\n"));
      onInject(files, tokenCount);
    } catch (e) {
      setError(String(e));
    } finally {
      setInjecting(false);
    }
  }

  const tokenEstimate = useMemo(
    () => selectedFiles.size * 800,
    [selectedFiles.size],
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          width: "100%",
          maxWidth: 480,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          padding: "1.25rem",
          gap: "0.75rem",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <SectionLabel noMargin>Select Files</SectionLabel>
          <button
            onClick={onClose}
            className="text-xs font-mono px-3 py-1 rounded-lg"
            style={{ background: "var(--border)", color: "var(--secondary)" }}
          >
            &#10006; close
          </button>
        </div>

        {error && <ErrorText>{error}</ErrorText>}

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <MonoText color="muted">Extensions</MonoText>
            <input
              type="text"
              className="input-base"
              style={{
                width: 120,
                height: 24,
                padding: "2px 8px",
                fontSize: 11,
              }}
              placeholder=".go, .rs"
              value={customExts}
              onChange={(e) => setCustomExts(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {EXT_GROUPS.flatMap((g) => g.exts).map((ext) => (
              <TagButton
                key={ext}
                active={enabledExts.has(ext)}
                onClick={() => toggleExt(ext)}
                style={{ padding: "2px 8px", fontSize: 11 }}
              >
                {ext}
              </TagButton>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <MonoText color="muted">
            {selectedFiles.size}/{filteredFiles.length} selected
          </MonoText>
          <button
            onClick={() => {
              if (selectedFiles.size === filteredFiles.length) {
                setSelectedFiles(new Set());
              } else {
                setSelectedFiles(new Set(filteredFiles.map((f) => f.path)));
              }
            }}
            className="text-xs font-mono px-2 py-0.5 rounded border"
            style={{ borderColor: "var(--border)", color: "var(--secondary)" }}
          >
            {selectedFiles.size === filteredFiles.length ? "none" : "all"}
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto min-h-0"
          style={{ maxHeight: 320 }}
        >
          {loading ? (
            <MonoText color="muted" className="text-center py-8">
              Scanning…
            </MonoText>
          ) : (
            <FileTreeBase
              files={filteredFiles}
              selected={selectedFiles}
              onToggle={toggleFile}
              locked={initialSelected}
            />
          )}
        </div>

        <div
          className="flex items-center justify-between pt-1 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <MonoText color="muted">
            {selectedFiles.size > 0 &&
              `~${(tokenEstimate / 1000).toFixed(1)}k tokens est.`}
          </MonoText>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleInject(true)}
              disabled={selectedFiles.size === 0 || injecting}
              className="btn-ghost text-xs py-1.5 px-3"
              style={{ opacity: selectedFiles.size === 0 ? 0.5 : 1 }}
            >
              {injecting ? "Loading…" : "Inject Summarized"}
            </button>
            <button
              onClick={() => handleInject(false)}
              disabled={selectedFiles.size === 0 || injecting}
              className="btn-primary text-sm"
              style={{ opacity: selectedFiles.size === 0 ? 0.5 : 1 }}
            >
              {injecting ? "Loading…" : injectLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
