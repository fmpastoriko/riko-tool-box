"use client";

import { useState, useEffect, useRef } from "react";
import JSZip from "jszip";
import FileTreeBase from "@/components/FileTreeBase";
import RepoSelector from "@/components/briefer/RepoSelector";
import PanelBox from "@/components/PanelBox";
import { ALLOWED_WRITE_EXTS } from "@/config/fileExtensions";

const isLocal = process.env.NEXT_PUBLIC_LOCAL === "true";

type Repo = { label: string; path: string };
type ZipEntry = { path: string; content: string; size: number };
type ApplyResult = {
  path: string;
  ok: boolean;
  prettified?: boolean;
  error?: string;
};

export default function ZipApplyPage() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [zipEntries, setZipEntries] = useState<ZipEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<ApplyResult[]>([]);
  const [applying, setApplying] = useState(false);
  const [loadingZip, setLoadingZip] = useState(false);
  const [zipName, setZipName] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLocal) return;
    fetch("/api/briefer/files")
      .then((r) => r.json())
      .then((d) => {
        if (d.repos) setRepos(d.repos);
      })
      .catch(() => {});
  }, []);

  async function handleZipPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadingZip(true);
    setError("");
    setZipEntries([]);
    setSelected(new Set());
    setResults([]);
    setZipName(file.name);

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
        const res = await fetch("/api/apply-zip", {
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
    setApplying(false);
  }

  const fileTreeEntries = zipEntries.map((e) => ({
    path: e.path,
    size: e.size,
  }));

  const successCount = results.filter((r) => r.ok).length;
  const failCount = results.filter((r) => !r.ok).length;

  if (!isLocal) {
    return (
      <div className="flex-1 flex flex-col gap-4">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--primary)" }}
          >
            Zip Apply
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--secondary)" }}>
            Apply zip file contents directly to a local repo with
            auto-formatting.
          </p>
        </div>
        <div
          className="card"
          style={{
            borderColor: "rgba(239,68,68,0.4)",
            background: "rgba(239,68,68,0.04)",
          }}
        >
          <p className="text-sm font-mono" style={{ color: "rgb(239,68,68)" }}>
            Disabled for the Vercel version because it writes directly to your
            local files. Clone the repo and run locally if you want this
            functionality.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap flex-shrink-0">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--primary)" }}
          >
            Zip Apply
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--secondary)" }}>
            Apply zip file contents directly to a local repo with
            auto-formatting.
          </p>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        <div className="w-80 flex-shrink-0 flex flex-col gap-3 overflow-y-auto pr-1">
          <div className="card space-y-2 flex-shrink-0">
            <p className="section-label mb-0">Repository</p>
            <RepoSelector
              repos={repos}
              selectedPath={selectedRepo?.path ?? null}
              onChange={setSelectedRepo}
              storageKey="zipApply_lastRepo"
            />
          </div>

          <div className="card space-y-2 flex-shrink-0">
            <p className="section-label mb-0">Zip File</p>
            <input
              ref={inputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={handleZipPick}
            />
            <button
              onClick={() => inputRef.current?.click()}
              className="btn-ghost text-xs py-1.5 px-3"
              disabled={loadingZip}
            >
              {loadingZip
                ? "Reading…"
                : zipName
                  ? `📦 ${zipName}`
                  : "Pick Zip File"}
            </button>
            {error && (
              <p className="text-xs" style={{ color: "rgb(239,68,68)" }}>
                {error}
              </p>
            )}
          </div>

          {zipEntries.length > 0 && (
            <div className="card flex flex-col min-h-0 flex-1">
              <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
                <p className="section-label mb-0">Files</p>
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-xs font-mono"
                    style={{ color: "var(--muted)" }}
                  >
                    {selected.size}/{zipEntries.length}
                  </span>
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
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
                <FileTreeBase
                  files={fileTreeEntries}
                  selected={selected}
                  onToggle={toggleFile}
                  onRenamePath={handleRenamePath}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleApply}
            disabled={!selectedRepo || selected.size === 0 || applying}
            className="btn-primary flex-shrink-0 justify-center"
            style={{ opacity: !selectedRepo || selected.size === 0 ? 0.6 : 1 }}
          >
            {applying
              ? "Applying…"
              : `Apply${selected.size > 0 ? ` (${selected.size})` : ""}`}
          </button>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
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
              <p
                className="text-xs font-mono"
                style={{ color: "var(--muted)" }}
              >
                {zipEntries.length === 0
                  ? "Pick a zip file and a repo to get started…"
                  : "Select files and click Apply…"}
              </p>
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
        </div>
      </div>
    </div>
  );
}
