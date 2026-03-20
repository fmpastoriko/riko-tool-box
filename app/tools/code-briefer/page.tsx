"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RepoFileTree, {
  DEFAULT_EXTS,
  EXT_GROUPS,
} from "@/components/RepoFileTree";
import { summarizeFile } from "@/lib/summarize";
import { parseSuggestion } from "@/lib/parseSuggestion";
import { formatSize, estimateTokens } from "@/lib/fileUtils";

const isLocal = process.env.NEXT_PUBLIC_LOCAL === "true";

const FOOTER_APPEND = `
DO NOT ADD ANY COMMENTS.
THIS IS A MUST: To avoid ambiguity, if you create files, NAME THE FILES WITH THEIR PATH. Example: app/tools/Page.tsx become "app-tools-page"
Return only code, no explanation unless asked.
Preserve existing code style and conventions.
Do not add placeholder comments like // TODO or // implement this.
If you need to tell me something, tell me through chat.
Before doing anything, explain your plan first and ask for my permission and input.
If you are in doubt, always ask me first — do not assume.
Do not make up non-existent problems for the sake of feedback. If the code is good enough, say so.
Do not use m-dash.`.trim();

const DEFAULT_PROMPT =
  "This is the summary of codebase. Tell me which files you need the full version to do the following task";
const DEFAULT_PROMPT_2 = "This is the code";

const LLM_TOKEN_LIMIT = 2000;
const LAST_REPO_KEY = "codeBriefer_lastRepo";
const DRAFT_KEY = "codeBriefer_draft";

type Template = { id: string; label: string; body: string; used_count: number };

function buildOutput(
  prompt: string,
  additionalPrompt: string,
  files: { path: string; content: string }[],
  footer: string,
  fullContextFiles: Set<string>,
): string {
  const parts: string[] = [];
  parts.push(footer);
  parts.push("");
  const fullPrompt = additionalPrompt.trim()
    ? `${prompt}\n${additionalPrompt.trim()}`
    : prompt;
  parts.push("PROMPT:");
  parts.push(fullPrompt);
  parts.push("");
  parts.push(
    "================================================================================",
  );
  parts.push("");
  for (const f of files) {
    parts.push(`# FILE: ${f.path}`);
    const body = fullContextFiles.has(f.path)
      ? f.content
      : summarizeFile(f.path, f.content);
    parts.push(body);
    parts.push("");
    parts.push(
      "================================================================================",
    );
    parts.push("");
  }
  return parts.join("\n");
}

type FileEntry = { path: string; size: number };

function parseGitignore(content: string): string[] {
  return content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

function isIgnored(filePath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    const clean = pattern.replace(/\/$/, "");
    if (
      filePath === clean ||
      filePath.startsWith(clean + "/") ||
      filePath.split("/").includes(clean)
    ) {
      return true;
    }
    if (clean.startsWith("*.")) {
      const ext = clean.slice(1);
      if (filePath.endsWith(ext)) return true;
    }
    if (clean.startsWith("**/")) {
      const suffix = clean.slice(3);
      if (filePath.endsWith("/" + suffix) || filePath === suffix) return true;
    }
  }
  return false;
}

function LocalFileTree({
  files,
  selected,
  onToggle,
  smartSelected,
}: {
  files: FileEntry[];
  selected: Set<string>;
  onToggle: (p: string) => void;
  smartSelected: Set<string>;
}) {
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
  if (files.length === 0)
    return (
      <div
        className="text-xs font-mono py-4 text-center"
        style={{ color: "var(--muted)" }}
      >
        No files match current filters
      </div>
    );
  return (
    <div className="space-y-0.5">
      {Array.from(grouped.entries()).map(([dir, dirFiles]) => (
        <div key={dir}>
          <button
            onClick={() => toggleDir(dir)}
            className="w-full text-left flex items-center gap-1.5 px-1 py-0.5 rounded text-xs font-mono"
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
                const isSmart = smartSelected.has(f.path);
                return (
                  <button
                    key={f.path}
                    onClick={() => onToggle(f.path)}
                    className="w-full text-left flex items-center gap-2 px-2 py-0.5 rounded text-xs font-mono transition-all"
                    style={{
                      background: isSelected
                        ? "var(--accent-dim)"
                        : "transparent",
                      color: isSelected ? "var(--primary)" : "var(--secondary)",
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

function isAnalyticalPrompt(prompt: string): boolean {
  const lower = prompt.toLowerCase().trim();
  return /^(explain|review|summarize|describe|analyze|analyse|what|why|how does|how do|walk me through|give me an overview|overview|audit|assess|document)/.test(
    lower,
  );
}

function resolveFileNames(raw: string, allPaths: string[]): string[] {
  const candidates = raw.match(/[\w.\-]+(?:\/[\w.\-]+)+|[\w.\-]+\.\w+/g) ?? [];
  const result: string[] = [];
  for (const token of candidates) {
    const lower = token.toLowerCase();
    const exact = allPaths.find(
      (p) => p === token || p.toLowerCase() === lower,
    );
    if (exact) {
      result.push(exact);
      continue;
    }
    const byFilename = allPaths.filter(
      (p) => p.split("/").pop()?.toLowerCase() === lower,
    );
    if (byFilename.length === 1) result.push(byFilename[0]);
    else if (byFilename.length > 1) result.push(...byFilename);
  }
  return [...new Set(result)];
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveDraft(data: object) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch {}
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

export default function CodeBrieferPage() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [repos, setRepos] = useState<{ label: string; path: string }[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<{
    label: string;
    path: string;
  } | null>(null);
  const [allFiles, setAllFiles] = useState<FileEntry[]>([]);
  const [fileContents, setFileContents] = useState<Map<string, string>>(
    new Map(),
  );
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [smartSelected, setSmartSelected] = useState<Set<string>>(new Set());
  const [fullContextFiles, setFullContextFiles] = useState<Set<string>>(
    new Set(),
  );
  const [joinedFiles, setJoinedFiles] = useState<
    { path: string; content: string }[]
  >([]);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [folderInputKey, setFolderInputKey] = useState(0);
  const [folderProgress, setFolderProgress] = useState<number | null>(null);
  const [waitingForPick, setWaitingForPick] = useState(false);

  useEffect(() => {
  const input = folderInputRef.current;
  if (!input) return;
  const onCancel = () => setWaitingForPick(false);
  input.addEventListener("cancel", onCancel);
  return () => input.removeEventListener("cancel", onCancel);
}, []);

  function toggleFullContext(filePath: string) {
    setFullContextFiles((prev) => {
      const next = new Set(prev);
      next.has(filePath) ? next.delete(filePath) : next.add(filePath);
      setOutput(
        buildOutput(
          promptBody,
          additionalPrompt,
          joinedFiles,
          FOOTER_APPEND,
          next,
        ),
      );
      return next;
    });
  }

  function expandAllContext() {
    const all = new Set(joinedFiles.map((f) => f.path));
    setFullContextFiles(all);
    setOutput(
      buildOutput(
        promptBody,
        additionalPrompt,
        joinedFiles,
        FOOTER_APPEND,
        all,
      ),
    );
  }

  function collapseAllContext() {
    const none = new Set<string>();
    setFullContextFiles(none);
    setOutput(
      buildOutput(
        promptBody,
        additionalPrompt,
        joinedFiles,
        FOOTER_APPEND,
        none,
      ),
    );
  }

  const allExpanded =
    joinedFiles.length > 0 &&
    joinedFiles.every((f) => fullContextFiles.has(f.path));

  const [enabledExts, setEnabledExts] = useState<Set<string>>(
    new Set(DEFAULT_EXTS),
  );
  const [customExts, setCustomExts] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(
    new Set(),
  );
  const safeSelectedTemplates =
    selectedTemplates instanceof Set ? selectedTemplates : new Set<string>();
  const [promptBody, setPromptBody] = useState(DEFAULT_PROMPT);
  const [additionalPrompt, setAdditionalPrompt] = useState("");
  const [fileNamesHint, setFileNamesHint] = useState("");
  const [output, setOutput] = useState("");
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingSmartSelect, setLoadingSmartSelect] = useState(false);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [repoError, setRepoError] = useState("");
  const router = useRouter();

  const [llmSuggestion, setLlmSuggestion] = useState("");
  const [llmSkippedReason, setLlmSkippedReason] = useState("");
  const [llmEnabled, setLlmEnabled] = useState(true);
  const [fullContext, setFullContext] = useState(false);
  const [llmStreaming, setLlmStreaming] = useState(false);
  const [llmCopied, setLlmCopied] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const llmRef = useRef<HTMLTextAreaElement>(null);
  const llmAbortRef = useRef<AbortController | null>(null);

  const [applying, setApplying] = useState(false);
  const [applyResults, setApplyResults] = useState<
    { file: string; ok: boolean; error?: string }[]
  >([]);

  const draftRestoredRef = useRef(false);

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
    if (isLocal) {
      fetch("/api/context/files")
        .then((r) => r.json())
        .then((d) => {
          if (d.repos) {
            setRepos(d.repos);
            const draft = loadDraft();
            if (draft) {
              if (draft.promptBody !== undefined)
                setPromptBody(draft.promptBody);
              if (draft.additionalPrompt !== undefined)
                setAdditionalPrompt(draft.additionalPrompt);
              if (draft.fileNamesHint !== undefined)
                setFileNamesHint(draft.fileNamesHint);
              if (draft.llmEnabled !== undefined)
                setLlmEnabled(draft.llmEnabled);
              if (draft.fullContext !== undefined)
                setFullContext(draft.fullContext);
              if (draft.customExts !== undefined)
                setCustomExts(draft.customExts);
              if (draft.enabledExts) setEnabledExts(new Set(draft.enabledExts));
              if (draft.selectedTemplates)
                setSelectedTemplates(new Set(draft.selectedTemplates));
              if (draft.selectedRepo) {
                const match = d.repos.find(
                  (r: { label: string; path: string }) =>
                    r.path === draft.selectedRepo.path,
                );
                if (match) {
                  loadRepo(match).then(() => {
                    if (draft.selectedFiles)
                      setSelectedFiles(new Set(draft.selectedFiles));
                  });
                }
              } else {
                try {
                  const lastPath = localStorage.getItem(LAST_REPO_KEY);
                  if (lastPath) {
                    const match = d.repos.find(
                      (r: { label: string; path: string }) =>
                        r.path === lastPath,
                    );
                    if (match) loadRepo(match);
                  }
                } catch {}
              }
            } else {
              try {
                const lastPath = localStorage.getItem(LAST_REPO_KEY);
                if (lastPath) {
                  const match = d.repos.find(
                    (r: { label: string; path: string }) => r.path === lastPath,
                  );
                  if (match) loadRepo(match);
                }
              } catch {}
            }
            draftRestoredRef.current = true;
          }
        })
        .catch(() => {});
    } else {
      draftRestoredRef.current = true;
    }
    fetch("/api/context/templates")
      .then((r) => r.json())
      .then((d) => {
        if (d.templates) setTemplates(d.templates);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!draftRestoredRef.current || !isLocal) return;
    saveDraft({
      promptBody,
      additionalPrompt,
      fileNamesHint,
      llmEnabled,
      fullContext,
      customExts,
      enabledExts: Array.from(enabledExts),
      selectedTemplates: Array.from(selectedTemplates),
      selectedRepo,
      selectedFiles: Array.from(selectedFiles),
    });
  }, [
    promptBody,
    additionalPrompt,
    fileNamesHint,
    llmEnabled,
    fullContext,
    customExts,
    enabledExts,
    selectedTemplates,
    selectedRepo,
    selectedFiles,
  ]);

  async function loadRepo(repo: { label: string; path: string }) {
    setSelectedRepo(repo);
    setAllFiles([]);
    setSelectedFiles(new Set());
    setSmartSelected(new Set());
    setFullContextFiles(new Set());
    setOutput("");
    setLlmSuggestion("");
    setLlmSkippedReason("");
    setChatSessionId(null);
    setRepoError("");
    setLoadingFiles(true);
    try {
      localStorage.setItem(LAST_REPO_KEY, repo.path);
    } catch {}
    try {
      const res = await fetch("/api/context/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoPath: repo.path }),
      });
      const data = await res.json();
      if (data.error) {
        setRepoError(data.error);
        return;
      }
      setAllFiles(data.files ?? []);
    } catch (e) {
      setRepoError(String(e));
    } finally {
      setFolderProgress(null);
      setLoadingFiles(false);
    }
  }

  async function handleFolderPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) {
      setFolderProgress(null);
      return;
    }

    setWaitingForPick(false);
    setFolderProgress(0);
    setLoadingFiles(true);
    setAllFiles([]);
    setFileContents(new Map());
    setSelectedFiles(new Set());
    setSmartSelected(new Set());
    setFullContextFiles(new Set());
    setOutput("");
    setLlmSuggestion("");
    setLlmSkippedReason("");
    setChatSessionId(null);
    setRepoError("");

    const folderName = files[0].webkitRelativePath.split("/")[0];
    setSelectedRepo({ label: folderName, path: folderName });

    const allFileList = Array.from(files);
    const total = allFileList.length;

    let gitignorePatterns: string[] = [];
    const gitignoreFile = allFileList.find(
      (f) => f.webkitRelativePath === `${folderName}/.gitignore`,
    );
    if (gitignoreFile) {
      try {
        const raw = await gitignoreFile.text();
        gitignorePatterns = parseGitignore(raw);
      } catch {}
    }

    const entries: FileEntry[] = [];
    const contents = new Map<string, string>();
    let processed = 0;

    const BATCH = 50;
    for (let i = 0; i < allFileList.length; i += BATCH) {
      const batch = allFileList.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (file) => {
          const relativePath = file.webkitRelativePath
            .split("/")
            .slice(1)
            .join("/");
          if (isIgnored(relativePath, gitignorePatterns)) return;
          const ext = "." + relativePath.split(".").pop()!.toLowerCase();
          if (!activeExts.has(ext)) return;
          try {
            const text = await file.text();
            entries.push({ path: relativePath, size: file.size });
            contents.set(relativePath, text);
          } catch {}
        }),
      );
      processed += batch.length;
      setFolderProgress(Math.round((processed / total) * 100));
    }

    entries.sort((a, b) => a.path.localeCompare(b.path));
    setAllFiles(entries);
    setFileContents(contents);
    setFolderProgress(null);
    setLoadingFiles(false);
  }

  function toggleFile(p: string) {
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

  function selectTemplate(t: Template) {
    if (selectedTemplates.has(t.id)) {
      setSelectedTemplates(new Set());
      setPromptBody(DEFAULT_PROMPT);
    } else {
      setSelectedTemplates(new Set([t.id]));
      fetch(`/api/context/templates/${t.id}/use`, { method: "POST" }).catch(
        () => {},
      );
      setPromptBody(t.body);
    }
  }

  async function streamLlmSuggestion(contextOutput: string) {
    setLlmSuggestion("");
    setLlmSkippedReason("");
    setLlmStreaming(true);
    const controller = new AbortController();
    llmAbortRef.current = controller;
    const analytical = isAnalyticalPrompt(promptBody);
    const stripped = contextOutput
      .replace(/^THIS IS A MUST:.*\n?/m, "")
      .replace(/^Before doing anything.*\n?/m, "");
    const llmInput = analytical
      ? stripped.slice(stripped.indexOf("PROMPT:"))
      : stripped;
    const systemPrompt = analytical
      ? `You are a helpful code assistant. The developer wants an explanation or review of the code provided.\n\nRespond in clear prose. Be direct and specific to the actual code shown.\nDo not invent problems that do not exist. Do not suggest changes unless there is a genuine issue.\nDo not use From/To code blocks. Do not output file change instructions.\nIf the code is well-written, say so plainly.`
      : `You are a precise code-change assistant. Output code changes in this exact format and nothing else.\n\nRULES:\n1. Read the PROMPT in the user message. That is the task.\n2. Find the exact lines in the FILE contents that need to change.\n3. Only output changes if there is a real, concrete problem to fix based on the PROMPT.\n4. Do NOT invent issues. Do NOT suggest "improvements" that were not asked for. If the code already does what the PROMPT asks, output: No changes needed\n5. Output one of:\n\nNo changes needed — if the code already satisfies the task\nToo many changes — if the diff is too large to express as small hunks\n\nOtherwise, for each changed location:\nFile: <exact relative path>\nFrom:\n\`\`\`\n<copy the EXACT lines verbatim from the file — minimum slice needed to uniquely locate the change>\n\`\`\`\nTo:\n\`\`\`\n<replacement lines>\n\`\`\`\n\nIf multiple locations need changes, output multiple File/From/To blocks in sequence.\nThe From block must be the shortest slice that is unique in the file — not the whole function.\nNo explanation. No prose. No questions. Just the blocks.`;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: llmInput },
          ],
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error("request failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setLlmSuggestion(accumulated);
        llmRef.current?.scrollTo({ top: llmRef.current.scrollHeight });
      }
      if (accumulated) {
        const sessionRes = await fetch("/api/chat/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: promptBody.slice(0, 60),
            repo_path: selectedRepo?.path ?? null,
          }),
        });
        const sessionData = await sessionRes.json();
        const sid = sessionData.session?.id;
        if (sid) {
          await fetch(`/api/chat/sessions/${sid}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "system", content: systemPrompt }),
          });
          await fetch(`/api/chat/sessions/${sid}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "user", content: contextOutput }),
          });
          await fetch(`/api/chat/sessions/${sid}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "assistant", content: accumulated }),
          });
          setChatSessionId(sid);
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError")
        setLlmSuggestion("Error: could not reach LLM.");
    } finally {
      llmAbortRef.current = null;
      setLlmStreaming(false);
    }
  }

  async function handleSmartSelect() {
    if (!selectedRepo || filteredFiles.length === 0 || !promptBody.trim())
      return;
    if (fileNamesHint.trim()) {
      const resolved = resolveFileNames(
        fileNamesHint,
        filteredFiles.map((f) => f.path),
      );
      if (resolved.length > 0) {
        setSmartSelected(new Set(resolved));
        setSelectedFiles(new Set(resolved));
        return;
      }
    }
    setLoadingSmartSelect(true);
    setSmartSelected(new Set());
    try {
      let files: { path: string; content: string }[];
      if (isLocal) {
        const contentsRes = await fetch("/api/context/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repoPath: selectedRepo.path,
            filePaths: filteredFiles.map((f) => f.path),
          }),
        });
        const contentsData = await contentsRes.json();
        files = (contentsData.files ?? [])
          .filter((f: { skipped?: boolean }) => !f.skipped)
          .map((f: { path: string; content: string }) => ({
            path: f.path,
            content: summarizeFile(f.path, f.content),
          }));
      } else {
        files = filteredFiles
          .map((f) => ({
            path: f.path,
            content: summarizeFile(f.path, fileContents.get(f.path) ?? ""),
          }))
          .filter((f) => f.content);
      }
      const smartRes = await fetch("/api/context/smart-select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: [promptBody, additionalPrompt].filter(Boolean).join(" "),
          files,
          additionalPrompt: additionalPrompt || "",
        }),
      });
      const smartData = await smartRes.json();
      const suggested: string[] = smartData.selected ?? [];
      setSmartSelected(new Set(suggested));
      setSelectedFiles(new Set(suggested));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSmartSelect(false);
    }
  }

  async function handleJoin() {
    if (!selectedRepo || selectedFiles.size === 0) return;
    setJoining(true);
    setOutput("");
    setLlmSuggestion("");
    setLlmSkippedReason("");
    setChatSessionId(null);
    setFullContextFiles(new Set());
    setJoinedFiles([]);
    try {
      const paths = Array.from(selectedFiles);
      let files: { path: string; content: string }[];
      if (isLocal) {
        const res = await fetch("/api/context/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repoPath: selectedRepo.path,
            filePaths: paths,
          }),
        });
        const data = await res.json();
        files = (data.files ?? []).filter(
          (f: { skipped?: boolean }) => !f.skipped,
        );
      } else {
        files = paths
          .map((p) => ({ path: p, content: fileContents.get(p) ?? "" }))
          .filter((f) => f.content);
      }
      setJoinedFiles(files);
      const fcSet = fullContext
        ? new Set(files.map((f) => f.path))
        : new Set<string>();
      setFullContextFiles(fcSet);
      const built = buildOutput(
        promptBody,
        additionalPrompt,
        files,
        FOOTER_APPEND,
        fcSet,
      );
      setOutput(built);
      if (!isLocal) {
        setFolderInputKey((k) => k + 1);
        setAllFiles([]);
        setFileContents(new Map());
        setSelectedFiles(new Set());
        setSmartSelected(new Set());
        setSelectedRepo(null);
      }
      clearDraft();
      const label =
        templates
          .filter((t) => selectedTemplates.has(t.id))
          .map((t) => t.label)
          .join("+") || "custom";
      await fetch("/api/context/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt_label: label,
          prompt_body: promptBody,
          additional_prompt: additionalPrompt || null,
          files_selected: paths,
          text_output: built,
          llm_suggestion: llmSuggestion || null,
        }),
      }).catch(() => {});
      if (llmEnabled) {
        const tokenCount = estimateTokens(built);
        if (tokenCount > LLM_TOKEN_LIMIT)
          setLlmSkippedReason(
            `LLM preview skipped: output is ~${tokenCount.toLocaleString()} tokens (limit ${LLM_TOKEN_LIMIT.toLocaleString()}).`,
          );
        else streamLlmSuggestion(built);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setJoining(false);
    }
  }

  async function handleApplyChanges() {
    if (!selectedRepo || !llmSuggestion || llmStreaming) return;
    const blocks = parseSuggestion(llmSuggestion);
    if (blocks.length === 0) return;
    setApplying(true);
    setApplyResults([]);
    const results: { file: string; ok: boolean; error?: string }[] = [];
    for (const block of blocks) {
      try {
        const res = await fetch("/api/context/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repoPath: selectedRepo.path,
            filePath: block.filePath,
            from: block.from,
            to: block.to,
          }),
        });
        const data = await res.json();
        results.push({
          file: block.filePath,
          ok: !!data.ok,
          error: data.error,
        });
      } catch (e) {
        results.push({ file: block.filePath, ok: false, error: String(e) });
      }
    }
    setApplyResults(results);
    setApplying(false);
  }

  const tokenCount = useMemo(() => estimateTokens(output), [output]);
  const isDefault1 = promptBody === DEFAULT_PROMPT;
  const isDefault2 = promptBody === DEFAULT_PROMPT_2;

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

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap flex-shrink-0">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--primary)" }}
          >
            Code Briefer
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--secondary)" }}>
            Join code files, prepend a prompt, ship to any LLM.
          </p>
        </div>
        <Link
          href="/tools/code-briefer/history"
          className="btn-ghost text-xs py-1 px-3"
        >
          History ↗
        </Link>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        <div className="w-80 flex-shrink-0 flex flex-col gap-3 overflow-y-auto pr-1">
          <div className="card space-y-2 flex-shrink-0">
            <p className="section-label mb-0">Repository</p>
            {isLocal ? (
              repos.length === 0 ? (
                <p
                  className="text-xs font-mono"
                  style={{ color: "var(--muted)" }}
                >
                  No repos found.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {repos.map((r) => (
                    <button
                      key={r.path}
                      onClick={() => loadRepo(r)}
                      className="text-xs font-mono px-2.5 py-1 rounded-lg border transition-all"
                      style={{
                        borderColor:
                          selectedRepo?.path === r.path
                            ? "var(--accent)"
                            : "var(--border)",
                        background:
                          selectedRepo?.path === r.path
                            ? "var(--accent-dim)"
                            : "transparent",
                        color:
                          selectedRepo?.path === r.path
                            ? "var(--accent)"
                            : "var(--secondary)",
                      }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              )
            ) : (
              <div className="space-y-2">
                <input
                  key={folderInputKey}
                  ref={folderInputRef}
                  type="file"
                  className="hidden"
                  {...({
                    webkitdirectory: "",
                  } as React.InputHTMLAttributes<HTMLInputElement>)}
                  onChange={handleFolderPick}
                  onClick={() => {
                    setWaitingForPick(true);
                  }}
                />
                <button
                  onClick={() => folderInputRef.current?.click()}
                  className="btn-ghost text-xs py-1.5 px-3"
                  disabled={loadingFiles}
                >
                  {loadingFiles
                    ? "Reading…"
                    : waitingForPick
                      ? "Waiting…"
                      : selectedRepo
                        ? `📁 ${selectedRepo.label}`
                        : "Pick Folder"}
                </button>
                {folderProgress !== null && (
                  <div
                    className="w-full rounded-full overflow-hidden"
                    style={{ height: 3, background: "var(--border)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: "100%",
                        background:
                          "linear-gradient(90deg, var(--accent) 25%, color-mix(in srgb, var(--accent) 30%, transparent) 50%, var(--accent) 75%)",
                        backgroundSize: "200% 100%",
                        animation: "shimmer 1.2s infinite linear",
                      }}
                    />
                  </div>
                )}
              </div>
            )}
            {repoError && (
              <p className="text-xs" style={{ color: "rgb(239,68,68)" }}>
                {repoError}
              </p>
            )}
            {isLocal && loadingFiles && (
              <p
                className="text-xs font-mono"
                style={{ color: "var(--muted)" }}
              >
                Scanning…
              </p>
            )}
          </div>

          <div className="card flex-shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <p className="section-label mb-0">Extensions</p>
              <input
                type="text"
                className="input-base"
                style={{
                  width: 90,
                  height: 22,
                  padding: "1px 6px",
                  fontSize: 10,
                }}
                placeholder=".go, .rs"
                value={customExts}
                onChange={(e) => setCustomExts(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {[...EXT_GROUPS.flatMap((g) => g.exts)].map((ext) => (
                <button
                  key={ext}
                  onClick={() => toggleExt(ext)}
                  className="text-xs font-mono px-1.5 py-0.5 rounded border transition-all"
                  style={{
                    borderColor: enabledExts.has(ext)
                      ? "var(--accent)"
                      : "var(--border)",
                    background: enabledExts.has(ext)
                      ? "var(--accent-dim)"
                      : "transparent",
                    color: enabledExts.has(ext)
                      ? "var(--accent)"
                      : "var(--muted)",
                  }}
                >
                  {ext}
                </button>
              ))}
            </div>
          </div>

          {selectedRepo && (
            <div className="card flex flex-col min-h-0 flex-1">
              <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
                <p className="section-label mb-0">Files</p>
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-xs font-mono"
                    style={{ color: "var(--muted)" }}
                  >
                    {selectedFiles.size}/{filteredFiles.length}
                  </span>
                  <button
                    onClick={() => {
                      selectedFiles.size === filteredFiles.length
                        ? setSelectedFiles(new Set())
                        : setSelectedFiles(
                            new Set(filteredFiles.map((f) => f.path)),
                          );
                    }}
                    className="text-xs font-mono px-1.5 py-0.5 rounded border"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--secondary)",
                    }}
                  >
                    {selectedFiles.size === filteredFiles.length
                      ? "none"
                      : "all"}
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
                <LocalFileTree
                  files={filteredFiles}
                  selected={selectedFiles}
                  onToggle={toggleFile}
                  smartSelected={smartSelected}
                />
              </div>
            </div>
          )}

          <div className="flex gap-1.5 flex-shrink-0 flex-wrap">
            <button
              onClick={() => setLlmEnabled((v) => !v)}
              className="btn-ghost text-xs font-mono py-1 px-2"
              style={{
                borderColor: llmEnabled ? "var(--accent)" : "var(--border)",
                color: llmEnabled ? "var(--accent)" : "var(--muted)",
              }}
            >
              {llmEnabled ? "LLM On" : "LLM Off"}
            </button>
            <button
              onClick={() => setFullContext((v) => !v)}
              className="btn-ghost text-xs font-mono py-1 px-2"
              style={{
                borderColor: fullContext ? "var(--accent)" : "var(--border)",
                color: fullContext ? "var(--accent)" : "var(--muted)",
              }}
            >
              {fullContext ? "Full Context On" : "Full Context Off"}
            </button>
            <button
              onClick={handleSmartSelect}
              disabled={
                !selectedRepo ||
                filteredFiles.length === 0 ||
                !promptBody.trim() ||
                loadingSmartSelect
              }
              className="btn-ghost flex-1 justify-center text-xs font-mono"
              style={{
                opacity:
                  !selectedRepo ||
                  filteredFiles.length === 0 ||
                  !promptBody.trim()
                    ? 0.5
                    : 1,
              }}
            >
              {loadingSmartSelect ? (
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin"
                    style={{
                      borderColor: "var(--accent)",
                      borderTopColor: "transparent",
                    }}
                  />
                  Thinking…
                </span>
              ) : (
                "Smart Select"
              )}
            </button>
            <button
              onClick={handleJoin}
              disabled={
                !selectedRepo ||
                selectedFiles.size === 0 ||
                !promptBody.trim() ||
                joining
              }
              className="btn-primary flex-1 justify-center text-xs font-mono"
              style={{
                opacity:
                  !selectedRepo ||
                  selectedFiles.size === 0 ||
                  !promptBody.trim()
                    ? 0.6
                    : 1,
              }}
            >
              {joining
                ? "Joining…"
                : `Join${selectedFiles.size > 0 ? ` (${selectedFiles.size})` : ""}`}
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 gap-3">
          <div className="card flex-shrink-0 space-y-2">
            <div className="flex flex-wrap gap-1.5 items-center">
              <p className="section-label mb-0 mr-1">Prompt</p>
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectTemplate(t)}
                  className="text-xs font-mono px-2 py-0.5 rounded border transition-all"
                  style={{
                    borderColor: safeSelectedTemplates.has(t.id)
                      ? "var(--accent)"
                      : "var(--border)",
                    background: safeSelectedTemplates.has(t.id)
                      ? "var(--accent-dim)"
                      : "transparent",
                    color: safeSelectedTemplates.has(t.id)
                      ? "var(--accent)"
                      : "var(--secondary)",
                  }}
                >
                  {t.label}
                </button>
              ))}
              <div className="ml-auto flex gap-1">
                <button
                  onClick={() => {
                    setPromptBody(DEFAULT_PROMPT);
                    setAdditionalPrompt("");
                    setFileNamesHint("");
                    setSelectedTemplates(new Set());
                  }}
                  className="text-xs font-mono px-2 py-0.5 rounded border transition-all"
                  style={{
                    borderColor: isDefault1 ? "var(--accent)" : "var(--border)",
                    color: isDefault1 ? "var(--accent)" : "var(--muted)",
                    background: isDefault1
                      ? "var(--accent-dim)"
                      : "transparent",
                  }}
                >
                  Default
                </button>
                <button
                  onClick={() => {
                    setPromptBody(DEFAULT_PROMPT_2);
                    setAdditionalPrompt("");
                    setFileNamesHint("");
                    setSelectedTemplates(new Set());
                  }}
                  className="text-xs font-mono px-2 py-0.5 rounded border transition-all"
                  style={{
                    borderColor: isDefault2 ? "var(--accent)" : "var(--border)",
                    color: isDefault2 ? "var(--accent)" : "var(--muted)",
                    background: isDefault2
                      ? "var(--accent-dim)"
                      : "transparent",
                  }}
                >
                  Default-2
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <textarea
                className="input-base flex-1 h-28 resize-none"
                value={promptBody}
                onChange={(e) => {
                  setPromptBody(e.target.value);
                  setSelectedTemplates(new Set());
                }}
                placeholder="Prompt…"
              />
              <textarea
                className="input-base flex-1 h-28 resize-none"
                value={additionalPrompt}
                onChange={(e) => setAdditionalPrompt(e.target.value)}
                placeholder="Additional prompt…"
              />
              <textarea
                className="input-base flex-1 h-28 resize-none"
                value={fileNamesHint}
                onChange={(e) => setFileNamesHint(e.target.value)}
                placeholder="File names (Smart Select bypass)…"
              />
            </div>
          </div>

          <div className="flex-1 flex gap-3 min-h-0">
            <div className="flex-1 flex flex-col min-h-0 card gap-2">
              <div className="flex items-center justify-between flex-shrink-0 flex-wrap gap-1">
                <p className="section-label mb-0">LLM Suggestion</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {llmStreaming && (
                    <span
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ background: "var(--accent)" }}
                    />
                  )}
                  {llmStreaming && (
                    <button
                      onClick={() => llmAbortRef.current?.abort()}
                      className="btn-ghost text-xs py-0.5 px-1.5"
                      style={{
                        color: "rgb(239,68,68)",
                        borderColor: "rgb(239,68,68)",
                      }}
                    >
                      ✕ Stop
                    </button>
                  )}
                  {llmSuggestion && !llmStreaming && (
                    <>
                      <button
                        onClick={() => output && streamLlmSuggestion(output)}
                        className="btn-ghost text-xs py-0.5 px-1.5"
                      >
                        ↺
                      </button>
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(llmSuggestion);
                          setLlmCopied(true);
                          setTimeout(() => setLlmCopied(false), 2000);
                        }}
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
                      {isLocal &&
                        selectedRepo &&
                        parseSuggestion(llmSuggestion).length > 0 && (
                          <button
                            onClick={handleApplyChanges}
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
                      onClick={() => output && streamLlmSuggestion(output)}
                      className="btn-ghost text-xs py-0.5 px-1.5"
                    >
                      Run anyway
                    </button>
                  )}
                </div>
              </div>
              {llmSkippedReason && !llmSuggestion ? (
                <p
                  className="text-xs font-mono"
                  style={{ color: "var(--muted)" }}
                >
                  {llmSkippedReason}
                </p>
              ) : (
                <textarea
                  ref={llmRef}
                  value={llmSuggestion}
                  onChange={(e) => setLlmSuggestion(e.target.value)}
                  className="flex-1 font-mono text-xs leading-relaxed w-full resize-none focus:outline-none overflow-y-auto"
                  style={{
                    color: "var(--secondary)",
                    background: "transparent",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                  readOnly={llmStreaming}
                  placeholder="LLM suggestion will appear here after Join…"
                />
              )}
              {applyResults.length > 0 && (
                <div className="space-y-0.5 flex-shrink-0">
                  {applyResults.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs font-mono"
                    >
                      <span
                        style={{
                          color: r.ok ? "rgb(34,197,94)" : "rgb(239,68,68)",
                        }}
                      >
                        {r.ok ? "✓" : "✕"}
                      </span>
                      <span style={{ color: "var(--secondary)" }}>
                        {r.file}
                      </span>
                      {r.error && (
                        <span style={{ color: "rgb(239,68,68)" }}>
                          {r.error}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

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
                      onClick={async () => {
                        await navigator.clipboard.writeText(output);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="btn-ghost text-xs py-0.5 px-1.5"
                    >
                      {copied ? "✓ Copied" : "Copy"}
                    </button>
                  )}
                  {output && (
                    <button
                      onClick={() => {
                        const label = (
                          templates
                            .filter((t) => selectedTemplates.has(t.id))
                            .map((t) => t.label)
                            .join("+") || "custom"
                        )
                          .toLowerCase()
                          .replace(/\s+/g, "-");
                        const ts = new Date()
                          .toISOString()
                          .slice(0, 16)
                          .replace("T", "-")
                          .replace(":", "");
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(
                          new Blob([output], { type: "text/plain" }),
                        );
                        a.download = `context-${label}-${ts}.txt`;
                        a.click();
                      }}
                      className="btn-ghost text-xs py-0.5 px-1.5"
                    >
                      ↓
                    </button>
                  )}
                  {joinedFiles.length > 0 && (
                    <button
                      onClick={
                        allExpanded ? collapseAllContext : expandAllContext
                      }
                      className="btn-ghost text-xs py-0.5 px-1.5"
                    >
                      {allExpanded ? "Collapse all" : "Expand all"}
                    </button>
                  )}
                </div>
              </div>
              {joinedFiles.length > 0 && (
                <>
                  <div className="flex flex-wrap gap-1 flex-shrink-0">
                    {joinedFiles.map((f) => {
                      const isFull = fullContextFiles.has(f.path);
                      return (
                        <button
                          key={f.path}
                          onClick={() => toggleFullContext(f.path)}
                          className="text-xs font-mono px-1.5 py-0.5 rounded border transition-all flex items-center gap-1"
                          style={{
                            borderColor: isFull
                              ? "var(--accent)"
                              : "var(--border)",
                            background: isFull
                              ? "var(--accent-dim)"
                              : "var(--bg)",
                            color: isFull
                              ? "var(--accent)"
                              : "var(--secondary)",
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-sm"
                            style={{
                              background: isFull
                                ? "var(--accent)"
                                : "var(--border)",
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
                onChange={(e) => setOutput(e.target.value)}
                className="flex-1 w-full font-mono text-xs leading-relaxed resize-none focus:outline-none overflow-y-auto"
                placeholder="Output will appear here after Join…"
                style={{ background: "transparent", color: "var(--secondary)" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
