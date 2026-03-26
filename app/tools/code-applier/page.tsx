"use client";
import { useState, useEffect, useRef } from "react";
import JSZip from "jszip";
import FileTreeBase from "@/components/FileTreeBase";
import RepoSelector from "@/components/briefer/RepoSelector";
import PanelBox from "@/components/PanelBox";
import { ALLOWED_WRITE_EXTS } from "@/config/fileExtensions";
import { TOOLS_CONFIG } from "@/config/tools";
import ToolHeader from "@/components/ToolHeader";
import ToolOptionsPanel from "@/components/ToolOptionsPanel";
import Card from "@/components/Card";
import EmptyState from "@/components/EmptyState";
import ErrorText from "@/components/ErrorText";
import MonoText from "@/components/MonoText";
const isLocal = process.env.NEXT_PUBLIC_LOCAL === "true";
const localOnlyReason =
  TOOLS_CONFIG.find((t) => t.href === "/tools/code-applier")?.localOnlyReason ??
  "";
type Repo = { label: string; path: string };
type ZipEntry = { path: string; content: string; size: number };
type BackupEntry = { backupPath: string; filePath: string; timestamp: number };
type ApplyResult = {
  path: string;
  ok: boolean;
  prettified?: boolean;
  error?: string;
};
function parsePastedText(text: string): ZipEntry[] {
  const entries: ZipEntry[] = [];
  const blockRegex = /^([^\n]+)\n```[^\n]*\n([\s\S]*?)```/gm;
  let match;
  while ((match = blockRegex.exec(text)) !== null) {
    const rawName = match[1].trim();
    const content = match[2];
    const hasPathMarker = rawName.includes("!@#");
    const cleanName = hasPathMarker ? rawName.replace(/!@#/g, "/") : rawName;
    const derivedPath = hasPathMarker ? cleanName : rawName;
    if (!derivedPath) continue;
    const ext = "." + derivedPath.split(".").pop()!.toLowerCase();
    if (!ALLOWED_WRITE_EXTS.has(ext)) continue;
    entries.push({ path: derivedPath, content, size: content.length });
  }
  return entries;
}
function groupBackupsByFile(
  backups: BackupEntry[],
): Map<string, BackupEntry[]> {
  const map = new Map<string, BackupEntry[]>();
  for (const b of backups) {
    if (!map.has(b.filePath)) map.set(b.filePath, []);
    map.get(b.filePath)!.push(b);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => b.timestamp - a.timestamp);
  }
  return map;
}
export default function CodeApplierPage() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [zipEntries, setZipEntries] = useState<ZipEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<ApplyResult[]>([]);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [loadingZip, setLoadingZip] = useState(false);
  const [zipName, setZipName] = useState("");
  const [pickedFilenames, setPickedFilenames] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [pasteError, setPasteError] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [selectedBackups, setSelectedBackups] = useState<Map<string, string>>(
    new Map(),
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);
  const toolConfig = TOOLS_CONFIG.find((t) => t.href === "/tools/code-applier");
  useEffect(() => {
    if (!isLocal) return;
    fetch("/api/code-briefer/files")
      .then((r) => r.json())
      .then((d) => {
        if (d.repos) setRepos(d.repos);
      })
      .catch(() => {});
  }, []);
  function loadBackups() {
    setLoadingBackups(true);
    fetch("/api/code-applier/backups")
      .then((r) => r.json())
      .then((d) => {
        setBackups(d.backups ?? []);
      })
      .catch(() => {})
      .finally(() => setLoadingBackups(false));
  }
  useEffect(() => {
    if (isLocal) loadBackups();
  }, []);
  async function handleZipPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadingZip(true);
    setError("");
    setZipEntries([]);
    setSelected(new Set());
    setResults([]);
    setApplied(false);
    setZipName("");
    setPickedFilenames([file.name]);
    setPasteText("");
    setPasteError("");
    setShowTextInput(false);
    try {
      const zip = await JSZip.loadAsync(file);
      const entries: ZipEntry[] = [];
      await Promise.all(
        Object.entries(zip.files).map(async ([rawPath, zipEntry]) => {
          if (zipEntry.dir) return;
          const filename = rawPath.split("/").pop() ?? rawPath;
          const strippedPath = filename.includes("!@#")
            ? filename.replace(/!@#/g, "/")
            : (() => {
                const parts = rawPath.split("/");
                return parts.length > 1 ? parts.slice(1).join("/") : rawPath;
              })();
          if (!strippedPath) return;
          const ext = "." + strippedPath.split(".").pop()!.toLowerCase();
          if (!ALLOWED_WRITE_EXTS.has(ext)) return;
          try {
            const content = await zipEntry.async("string");
            entries.push({ path: strippedPath, content, size: content.length });
          } catch {}
        }),
      );
      entries.sort((a, b) => a.path.localeCompare(b.path));
      setZipEntries(entries);
      setSelected(new Set(entries.map((e) => e.path)));
    } catch (err) {
      setError(String(err));
    } finally {
      setLoadingZip(false);
      e.target.value = "";
    }
  }
  async function handleFilesPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setError("");
    setResults([]);
    setZipName("");
    setPickedFilenames(files.map((f) => f.name));
    setZipEntries([]);
    setSelected(new Set());
    setApplied(false);
    setPasteText("");
    setPasteError("");
    setShowTextInput(false);
    const newEntries: ZipEntry[] = [];
    await Promise.all(
      files.map(async (file) => {
        const filename = file.name;
        const derivedPath = filename.includes("!@#")
          ? filename.replace(/!@#/g, "/")
          : filename;
        if (!derivedPath) return;
        const ext = "." + derivedPath.split(".").pop()!.toLowerCase();
        if (!ALLOWED_WRITE_EXTS.has(ext)) return;
        try {
          const content = await file.text();
          newEntries.push({ path: derivedPath, content, size: content.length });
        } catch {}
      }),
    );
    if (newEntries.length === 0) return;
    setZipEntries((prev) => {
      const map = new Map(prev.map((e) => [e.path, e]));
      for (const entry of newEntries) map.set(entry.path, entry);
      return Array.from(map.values()).sort((a, b) =>
        a.path.localeCompare(b.path),
      );
    });
    setSelected((prev) => {
      const next = new Set(prev);
      for (const entry of newEntries) next.add(entry.path);
      return next;
    });
    e.target.value = "";
  }
  function handleParsePaste() {
    setPasteError("");
    const entries = parsePastedText(pasteText);
    if (entries.length === 0) {
      setPasteError("No valid file blocks found.");
      return;
    }
    setError("");
    setResults([]);
    setZipName("");
    setPickedFilenames([]);
    setApplied(false);
    entries.sort((a, b) => a.path.localeCompare(b.path));
    setZipEntries(entries);
    setSelected(new Set(entries.map((e) => e.path)));
    setShowTextInput(false);
  }
  function toggleFile(p: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  }
  function handleRenamePath(oldPath: string, newPath: string) {
    setZipEntries((prev) =>
      prev.map((e) => (e.path === oldPath ? { ...e, path: newPath } : e)),
    );
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(oldPath)) {
        next.delete(oldPath);
        next.add(newPath);
      }
      return next;
    });
  }
  async function handleApply() {
    if (!selectedRepo || selected.size === 0 || applying) return;
    setApplying(true);
    setResults([]);
    const toApply = zipEntries.filter((e) => selected.has(e.path));
    const out: ApplyResult[] = [];
    for (const entry of toApply) {
      try {
        const res = await fetch("/api/code-applier/backup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repoPath: selectedRepo.path,
            filePath: entry.path,
            content: entry.content,
          }),
        });
        const data = await res.json();
        out.push({
          path: entry.path,
          ok: !!data.ok,
          prettified: data.prettified,
          error: data.error,
        });
      } catch (err) {
        out.push({ path: entry.path, ok: false, error: String(err) });
      }
    }
    setResults(out);
    setApplied(true);
    const allPrettified =
      out.length > 0 && out.every((r) => r.ok && r.prettified);
    if (allPrettified && pickedFilenames.length > 0) {
      try {
        await fetch("/api/code-applier/delete-zip", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filenames: pickedFilenames }),
        });
      } catch {}
      setZipEntries([]);
      setSelected(new Set());
      setZipName("");
      setPickedFilenames([]);
    }
    setApplying(false);
    loadBackups();
  }
  async function handleRevert() {
    if (!selectedRepo || selectedBackups.size === 0 || applying) return;
    setApplying(true);
    setResults([]);
    const out: ApplyResult[] = [];
    for (const [filePath, backupPath] of selectedBackups.entries()) {
      try {
        const res = await fetch("/api/code-applier/revert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repoPath: selectedRepo.path,
            filePath,
            backupPath,
          }),
        });
        const data = await res.json();
        out.push({
          path: filePath,
          ok: !!data.ok,
          prettified: data.prettified,
          error: data.error,
        });
      } catch (err) {
        out.push({ path: filePath, ok: false, error: String(err) });
      }
    }
    setResults(out);
    setSelectedBackups(new Map());
    setApplied(false);
    setApplying(false);
    loadBackups();
  }
  const fileTreeEntries = zipEntries.map((e) => ({
    path: e.path,
    size: e.size,
  }));
  const successCount = results.filter((r) => r.ok).length;
  const failCount = results.filter((r) => !r.ok).length;
  const groupedBackups = groupBackupsByFile(backups);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  if (isMobile) {
    return (
      <div className="flex-1 flex items-center justify-center text-center px-6">
        <div>
          <p className="text-2xl mb-3">💻</p>
          <p className="font-mono text-sm" style={{ color: "var(--primary)" }}>
            Not optimized for phone.
          </p>
          <p
            className="font-mono text-xs mt-1"
            style={{ color: "var(--muted)" }}
          >
            Open at computer.
          </p>
        </div>
      </div>
    );
  }
  if (!isLocal) {
    return (
      <div className="flex-1 flex flex-col gap-4">
        <ToolHeader
          title="Code Applier"
          subtitle="Apply zip file contents directly to a local repo with auto-formatting."
          mediumUrl={toolConfig?.mediumUrl}
        />
        <Card
          style={{
            borderColor: "rgba(239,68,68,0.4)",
            background: "rgba(239,68,68,0.04)",
          }}
        >
          <ErrorText>{localOnlyReason}</ErrorText>
        </Card>
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col min-h-0 gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap flex-shrink-0">
        <ToolHeader
          title="Code Applier"
          subtitle="Apply zip file contents directly to a local repo with auto-formatting."
          mediumUrl={toolConfig?.mediumUrl}
        />
      </div>
      <div className="flex-1 flex gap-4 min-h-0">
        <ToolOptionsPanel>
          <Card title="Repository" className="flex-shrink-0">
            <RepoSelector
              repos={repos}
              selectedPath={selectedRepo?.path ?? null}
              onChange={setSelectedRepo}
              storageKey="codeapplier_lastRepo"
            />
          </Card>
          <Card title="File Picker" className="flex-shrink-0">
            <input
              ref={inputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={handleZipPick}
            />
            <input
              ref={filesInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFilesPick}
            />
            <div className="flex gap-2">
              <button
                onClick={() => inputRef.current?.click()}
                className="btn-ghost text-xs py-1.5 px-3 flex-1"
                disabled={loadingZip}
              >
                {loadingZip
                  ? "Reading…"
                  : zipName
                    ? `📦 ${zipName}`
                    : "Pick Zip"}
              </button>
              <button
                onClick={() => filesInputRef.current?.click()}
                className="btn-ghost text-xs py-1.5 px-3 flex-1"
                disabled={loadingZip}
              >
                Pick Files
              </button>
              <button
                onClick={() => setShowTextInput((s) => !s)}
                className="btn-ghost text-xs py-1.5 px-3 flex-1"
              >
                {showTextInput ? "Hide Input" : "Input text"}
              </button>
            </div>
            {error && <ErrorText>{error}</ErrorText>}
          </Card>
          {showTextInput && (
            <Card className="flex-shrink-0">
              <div className="space-y-1.5">
                <textarea
                  className="w-full text-xs font-mono rounded border bg-transparent resize-none"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--secondary)",
                    padding: "6px 8px",
                    minHeight: "80px",
                    outline: "none",
                  }}
                  placeholder={`Paste output here…\n\nconfig!@#chat.ts\n\`\`\`typescript\n…\n\`\`\``}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                />
                <button
                  onClick={handleParsePaste}
                  className="btn-ghost text-xs py-1.5 px-3 w-full"
                  disabled={!pasteText.trim()}
                >
                  Parse
                </button>
                {pasteError && <ErrorText>{pasteError}</ErrorText>}
              </div>
            </Card>
          )}
          {zipEntries.length > 0 && (
            <Card
              title="Files"
              className="flex flex-col min-h-0 flex-1"
              headerRight={
                <div className="flex items-center gap-1.5">
                  <MonoText color="muted">
                    {selected.size}/{zipEntries.length}
                  </MonoText>
                  <button
                    onClick={() =>
                      selected.size === zipEntries.length
                        ? setSelected(new Set())
                        : setSelected(new Set(zipEntries.map((e) => e.path)))
                    }
                    className="text-xs font-mono px-1.5 py-0.5 rounded border"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--secondary)",
                    }}
                  >
                    {selected.size === zipEntries.length ? "none" : "all"}
                  </button>
                </div>
              }
            >
              <div className="flex-1 overflow-y-auto min-h-0">
                <FileTreeBase
                  files={fileTreeEntries}
                  selected={selected}
                  onToggle={toggleFile}
                  onRenamePath={handleRenamePath}
                />
              </div>
            </Card>
          )}
          <button
            onClick={handleApply}
            disabled={
              !selectedRepo || selected.size === 0 || applying || applied
            }
            className="btn-primary flex-shrink-0 justify-center"
            style={{
              opacity:
                !selectedRepo || selected.size === 0 || applied ? 0.6 : 1,
            }}
          >
            {applying
              ? "Applying…"
              : `Apply${selected.size > 0 ? ` (${selected.size})` : ""}`}
          </button>
        </ToolOptionsPanel>
        <div className="flex-1 flex flex-row min-h-0 gap-4">
          <PanelBox
            title="Results"
            headerRight={
              results.length > 0 ? (
                <>
                  <span
                    className="text-xs font-mono"
                    style={{ color: "rgb(34,197,94)" }}
                  >
                    {successCount} ok
                  </span>
                  {failCount > 0 && (
                    <span
                      className="text-xs font-mono"
                      style={{ color: "rgb(239,68,68)" }}
                    >
                      {failCount} failed
                    </span>
                  )}
                </>
              ) : undefined
            }
          >
            {results.length === 0 ? (
              <EmptyState
                message={
                  zipEntries.length === 0
                    ? "Pick a zip file, files, or paste output and select a repo to get started…"
                    : "Select files and click Apply…"
                }
              />
            ) : (
              <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs font-mono"
                  >
                    <span
                      style={{
                        color: r.ok ? "rgb(34,197,94)" : "rgb(239,68,68)",
                        flexShrink: 0,
                      }}
                    >
                      {r.ok ? "✓" : "✕"}
                    </span>
                    <span
                      className="flex-1 truncate"
                      style={{ color: "var(--secondary)" }}
                    >
                      {r.path}
                    </span>
                    {r.ok && r.prettified && (
                      <span
                        className="flex-shrink-0"
                        style={{ color: "var(--muted)" }}
                      >
                        prettier ✓
                      </span>
                    )}
                    {r.error && (
                      <span
                        className="flex-shrink-0"
                        style={{ color: "rgb(239,68,68)" }}
                      >
                        {r.error}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </PanelBox>
          <Card
            title="Revert Changes"
            className="flex flex-col gap-3 flex-shrink-0 overflow-y-auto"
            style={{ minWidth: 240, maxWidth: 280 }}
            headerRight={
              <button
                onClick={loadBackups}
                className="text-xs font-mono px-1.5 py-0.5 rounded border"
                style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                disabled={loadingBackups}
              >
                {loadingBackups ? "…" : "↺"}
              </button>
            }
          >
            {!selectedRepo && (
              <MonoText color="muted">Select a repo to revert.</MonoText>
            )}
            {selectedRepo && backups.length === 0 && !loadingBackups && (
              <MonoText color="muted">No backups found in /tmp.</MonoText>
            )}
            {selectedRepo && groupedBackups.size > 0 && (
              <>
                <MonoText color="muted">
                  Pick a snapshot per file, then click Revert.
                </MonoText>
                <div className="space-y-3 flex-1 overflow-y-auto min-h-0">
                  {Array.from(groupedBackups.entries()).map(
                    ([filePath, snapshots]) => {
                      const selected = selectedBackups.get(filePath);
                      return (
                        <div key={filePath} className="space-y-1">
                          <MonoText color="secondary" className="truncate">
                            {filePath.split("/").pop()}
                          </MonoText>
                          <div className="space-y-0.5">
                            {snapshots.map((snap, i) => {
                              const isSelected = selected === snap.backupPath;
                              return (
                                <button
                                  key={snap.backupPath}
                                  onClick={() => {
                                    setSelectedBackups((prev) => {
                                      const next = new Map(prev);
                                      if (isSelected) {
                                        next.delete(filePath);
                                      } else {
                                        next.set(filePath, snap.backupPath);
                                      }
                                      return next;
                                    });
                                  }}
                                  className="w-full text-left flex items-center gap-2 px-2 py-1 rounded text-xs font-mono transition-all"
                                  style={{
                                    background: isSelected
                                      ? "var(--accent-dim)"
                                      : "var(--bg)",
                                    border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                                    color: isSelected
                                      ? "var(--accent)"
                                      : "var(--secondary)",
                                  }}
                                >
                                  <span className="flex-1">
                                    {i === 0 ? "latest" : `#${i + 1}`}
                                  </span>
                                  <span
                                    style={{
                                      color: "var(--muted)",
                                      fontSize: 10,
                                    }}
                                  >
                                    {new Date(
                                      snap.timestamp,
                                    ).toLocaleTimeString("en-GB", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      second: "2-digit",
                                    })}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
                <button
                  onClick={handleRevert}
                  disabled={applying || selectedBackups.size === 0}
                  className="btn-primary text-xs justify-center flex-shrink-0"
                  style={{
                    opacity: applying || selectedBackups.size === 0 ? 0.6 : 1,
                  }}
                >
                  {applying
                    ? "Reverting…"
                    : selectedBackups.size > 0
                      ? `Revert (${selectedBackups.size})`
                      : "Revert"}
                </button>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
