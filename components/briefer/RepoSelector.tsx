"use client";

import { useEffect } from "react";

interface RepoSelectorProps {
  repos: { label: string; path: string }[];
  selectedPath: string | null;
  onChange: (repo: { label: string; path: string }) => void;
  disabled?: boolean;
  storageKey?: string;
}

export default function RepoSelector({
  repos,
  selectedPath,
  onChange,
  disabled,
  storageKey,
}: RepoSelectorProps) {
  useEffect(() => {
    if (!storageKey || repos.length === 0 || selectedPath) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const match = repos.find((r) => r.path === saved);
        if (match) onChange(match);
      }
    } catch {}
  }, [repos, storageKey]);

  if (repos.length === 0) {
    return (
      <p className="text-xs font-mono" style={{ color: "var(--muted)" }}>
        No repos found.
      </p>
    );
  }

  return (
    <select
      className="input-base text-xs font-mono py-1 px-2.5 w-full"
      value={selectedPath ?? ""}
      disabled={disabled}
      onChange={(e) => {
        const repo = repos.find((r) => r.path === e.target.value);
        if (!repo) return;
        if (storageKey) {
          try {
            localStorage.setItem(storageKey, repo.path);
          } catch {}
        }
        onChange(repo);
      }}
      style={{ minHeight: 32 }}
    >
      <option value="" disabled>
        Select a repository
      </option>
      {repos.map((r) => (
        <option key={r.path} value={r.path}>
          {r.label}
        </option>
      ))}
    </select>
  );
}
