"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RepoFileTree from "@/components/RepoFileTree";
import { DEFAULT_EXTS, EXT_GROUPS } from "@/config/fileExtensions";
import FileTreeBase from "@/components/FileTreeBase";
import LlmSuggestionPanel from "@/components/briefer/LlmSuggestionPanel";
import OutputPanel from "@/components/briefer/OutputPanel";
import { summarizeFile } from "@/lib/summarize";
import { parseSuggestion } from "@/lib/parseSuggestion";
import { formatSize, estimateTokens } from "@/lib/fileUtils";
import {
  buildOutput,
  FOOTER_APPEND,
  DEFAULT_PROMPT,
  DEFAULT_PROMPT_2,
} from "@/lib/briefer/buildOutput";
import { parseGitignore, isIgnored } from "@/lib/briefer/gitignore";
import { resolveFileNames } from "@/lib/briefer/resolveFileNames";
import {
  loadDraft,
  saveDraft,
  clearDraft,
  LAST_REPO_KEY,
  DRAFT_KEY,
} from "@/lib/briefer/draft";
import {
  isAnalyticalPrompt,
  buildAnalyticalSystemPrompt,
  buildChangeSystemPrompt,
} from "@/lib/briefer/llmPrompts";
import { LLM_TOKEN_LIMIT } from "@/config/llm";
import type { ModelInfo } from "@/components/chatbot/types";

const isLocal = process.env.NEXT_PUBLIC_LOCAL === "true";

type FileEntry = { path: string; size: number };
type Template = { id: string; label: string; body: string; used_count: number };

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
  const [fullContext, setFullContext] = useState(true);
  const [llmStreaming, setLlmStreaming] = useState(false);
  const [llmCopied, setLlmCopied] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const llmRef = useRef<HTMLTextAreaElement>(null);
  const llmAbortRef = useRef<AbortController | null>(null);

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [modelUsed, setModelUsed] = useState<string>("");
  const [applying, setApplying] = useState(false);
  const [applyResults, setApplyResults] = useState<
    { file: string; ok: boolean; error?: string }[]
  >([]);

  const draftRestoredRef = useRef(false);

  const [fileSearchTerm, setFileSearchTerm] = useState("");

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

  const displayedFiles = useMemo(() => {
    if (!fileSearchTerm) {
      return filteredFiles;
    }
    const lowerCaseSearch = fileSearchTerm.toLowerCase();
    return filteredFiles.filter((f) =>
      f.path.toLowerCase().includes(lowerCaseSearch),
    );
  }, [filteredFiles, fileSearchTerm]);

  useEffect(() => {
    fetch("/api/chat/models")
      .then((r) => r.json())
      .then((d) => {
        if (d.models?.length > 0) setModels(d.models);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isLocal) {
      fetch("/api/briefer/files")
        .then((r) => r.json())
        .then((d) => {
          if (d.repos) {
            setRepos(d.repos);
            const draft = loadDraft();
            if (draft) {
              if (draft.promptBody !== undefined)
                setPromptBody(draft.promptBody as string);
              if (draft.additionalPrompt !== undefined)
                setAdditionalPrompt(draft.additionalPrompt as string);
              if (draft.fileNamesHint !== undefined)
                setFileNamesHint(draft.fileNamesHint as string);
              if (draft.llmEnabled !== undefined)
                setLlmEnabled(draft.llmEnabled as boolean);
              if (draft.fullContext !== undefined)
                setFullContext(draft.fullContext as boolean);
              if (draft.customExts !== undefined)
                setCustomExts(draft.customExts as string);
              if (draft.enabledExts)
                setEnabledExts(new Set(draft.enabledExts as string[]));
              if (draft.selectedTemplates)
                setSelectedTemplates(
                  new Set(draft.selectedTemplates as string[]),
                );
              if (draft.selectedRepo) {
                const match = d.repos.find(
                  (r: { label: string; path: string }) =>
                    r.path === (draft.selectedRepo as { path: string }).path,
                );
                if (match) {
                  loadRepo(match).then(() => {
                    if (draft.selectedFiles)
                      setSelectedFiles(
                        new Set(draft.selectedFiles as string[]),
                      );
                  });
                }
              } else {
                restoreLastRepo(d.repos);
              }
            } else {
              restoreLastRepo(d.repos);
            }
            draftRestoredRef.current = true;
          }
        })
        .catch(() => {});
    } else {
      draftRestoredRef.current = true;
    }

    fetch("/api/briefer/templates")
      .then((r) => r.json())
      .then((d) => {
        if (d.templates) setTemplates(d.templates);
      })
      .catch(() => {});
  }, []);

  function restoreLastRepo(repos: { label: string; path: string }[]) {
    try {
      const lastPath = localStorage.getItem(LAST_REPO_KEY);
      if (lastPath) {
        const match = repos.find((r) => r.path === lastPath);
        if (match) loadRepo(match);
      }
    } catch {}
  }

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
      const res = await fetch("/api/briefer/files", {
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
      fetch(`/api/briefer/templates/${t.id}/use`, { method: "POST" }).catch(
        () => {},
      );
      setPromptBody(t.body);
    }
  }

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

  async function streamLlmSuggestion(contextOutput: string) {
    setLlmSuggestion("");
    setLlmSkippedReason("");
    setModelUsed("");
    setApplyResults([]);
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
      ? buildAnalyticalSystemPrompt()
      : buildChangeSystemPrompt();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: llmInput },
          ],
          model: selectedModel || undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        if (res.status === 503) {
          setLlmSkippedReason("No models available.");
          return;
        }
        throw new Error("request failed");
      }

      const usedModel = res.headers.get("X-Model-Used") ?? "";
      if (usedModel) setModelUsed(usedModel);

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
        const contentsRes = await fetch("/api/briefer/read", {
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

      const smartRes = await fetch("/api/briefer/smart-select", {
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
    setModelUsed("");
    setChatSessionId(null);
    setFullContextFiles(new Set());
    setJoinedFiles([]);

    try {
      const paths = Array.from(selectedFiles);
      let files: { path: string; content: string }[];

      if (isLocal) {
        const res = await fetch("/api/briefer/read", {
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

      await fetch("/api/briefer/sessions", {
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
        if (tokenCount > LLM_TOKEN_LIMIT) {
          setLlmSkippedReason(
            `LLM preview skipped: output is ~${tokenCount.toLocaleString()} tokens (limit ${LLM_TOKEN_LIMIT.toLocaleString()}).`,
          );
        } else {
          const allExhausted =
            models.length > 0 && models.every((m) => m.exhausted);
          if (allExhausted) {
            setLlmSkippedReason("No models available.");
          } else {
            streamLlmSuggestion(built);
          }
        }
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
        const res = await fetch("/api/briefer/apply", {
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

  function handleDownload() {
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
    a.href = URL.createObjectURL(new Blob([output], { type: "text/plain" }));
    a.download = `context-${label}-${ts}.txt`;
    a.click();
  }

  const tokenCount = useMemo(() => estimateTokens(output), [output]);
  const isDefault1 = promptBody === DEFAULT_PROMPT;
  const isDefault2 = promptBody === DEFAULT_PROMPT_2;
  const allModelsExhausted =
    models.length > 0 && models.every((m) => m.exhausted);

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
                <select
                  className="input-base text-xs font-mono py-1 px-2.5 w-full"
                  value={selectedRepo?.path || ""}
                  onChange={(e) => {
                    const selectedPath = e.target.value;
                    const repo = repos.find((r) => r.path === selectedPath);
                    if (repo) {
                      loadRepo(repo);
                    }
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
                  onClick={() => setWaitingForPick(true)}
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
                    {selectedFiles.size}/{displayedFiles.length}
                  </span>
                  <button
                    onClick={() => {
                      selectedFiles.size === displayedFiles.length
                        ? setSelectedFiles(new Set())
                        : setSelectedFiles(
                            new Set(displayedFiles.map((f) => f.path)),
                          );
                    }}
                    className="text-xs font-mono px-1.5 py-0.5 rounded border"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--secondary)",
                    }}
                  >
                    {selectedFiles.size === displayedFiles.length
                      ? "none"
                      : "all"}
                  </button>
                </div>
              </div>
              <input
                type="text"
                placeholder="Search files..."
                className="input-base text-xs mb-2"
                value={fileSearchTerm}
                onChange={(e) => setFileSearchTerm(e.target.value)}
              />
              <div className="flex-1 overflow-y-auto min-h-0">
                <FileTreeBase
                  files={displayedFiles}
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
            </div>
            <div className="flex gap-2">
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex justify-start gap-1">
                  <button
                    onClick={() => {
                      setPromptBody(DEFAULT_PROMPT);
                      setAdditionalPrompt("");
                      setFileNamesHint("");
                      setSelectedTemplates(new Set());
                    }}
                    className="text-xs font-mono px-2 py-0.5 rounded border transition-all"
                    style={{
                      borderColor: isDefault1
                        ? "var(--accent)"
                        : "var(--border)",
                      color: isDefault1 ? "var(--accent)" : "var(--muted)",
                      background: isDefault1
                        ? "var(--accent-dim)"
                        : "transparent",
                    }}
                  >
                    Default 1
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
                      borderColor: isDefault2
                        ? "var(--accent)"
                        : "var(--border)",
                      color: isDefault2 ? "var(--accent)" : "var(--muted)",
                      background: isDefault2
                        ? "var(--accent-dim)"
                        : "transparent",
                    }}
                  >
                    Default 2
                  </button>
                </div>
                <textarea
                  className="input-base flex-1 resize-none"
                  style={{ minHeight: 96 }}
                  value={promptBody}
                  onChange={(e) => {
                    setPromptBody(e.target.value);
                    setSelectedTemplates(new Set());
                  }}
                  placeholder="Prompt…"
                />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex justify-end">
                  <button
                    onClick={() => setAdditionalPrompt("")}
                    className="text-xs font-mono px-1.5 py-0.5 rounded border"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--muted)",
                    }}
                  >
                    Clear
                  </button>
                </div>
                <textarea
                  className="input-base flex-1 resize-none"
                  style={{ minHeight: 0 }}
                  value={additionalPrompt}
                  onChange={(e) => setAdditionalPrompt(e.target.value)}
                  placeholder="Additional prompt…"
                />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex justify-end">
                  <button
                    onClick={() => setFileNamesHint("")}
                    className="text-xs font-mono px-1.5 py-0.5 rounded border"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--muted)",
                    }}
                  >
                    Clear
                  </button>
                </div>
                <textarea
                  className="input-base flex-1 resize-none"
                  style={{ minHeight: 0 }}
                  value={fileNamesHint}
                  onChange={(e) => setFileNamesHint(e.target.value)}
                  placeholder="File names (Smart Select bypass)…"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 flex gap-3 min-h-0">
            <LlmSuggestionPanel
              llmSuggestion={llmSuggestion}
              llmSkippedReason={llmSkippedReason}
              llmStreaming={llmStreaming}
              llmCopied={llmCopied}
              modelUsed={modelUsed}
              models={models}
              selectedModel={selectedModel}
              applying={applying}
              applyResults={applyResults}
              chatSessionId={chatSessionId}
              canApply={
                isLocal &&
                !!selectedRepo &&
                parseSuggestion(llmSuggestion).length > 0
              }
              llmRef={llmRef}
              onModelChange={setSelectedModel}
              onStop={() => llmAbortRef.current?.abort()}
              onRetry={() => output && streamLlmSuggestion(output)}
              onCopy={async () => {
                await navigator.clipboard.writeText(llmSuggestion);
                setLlmCopied(true);
                setTimeout(() => setLlmCopied(false), 2000);
              }}
              onRunAnyway={() => output && streamLlmSuggestion(output)}
              onApply={handleApplyChanges}
              onChange={setLlmSuggestion}
            />
            <OutputPanel
              output={output}
              tokenCount={tokenCount}
              copied={copied}
              joinedFiles={joinedFiles}
              fullContextFiles={fullContextFiles}
              allExpanded={allExpanded}
              templates={templates}
              selectedTemplates={safeSelectedTemplates}
              onCopy={async () => {
                await navigator.clipboard.writeText(output);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              onDownload={handleDownload}
              onToggleFullContext={toggleFullContext}
              onExpandAll={expandAllContext}
              onCollapseAll={collapseAllContext}
              onChange={setOutput}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
