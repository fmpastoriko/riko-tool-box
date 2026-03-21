"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import RepoFileTree from "@/components/RepoFileTree";
import MessageBubble, {
  markdownStyles,
} from "@/components/chatbot/MessageBubble";
import SessionList from "@/components/chatbot/SessionList";
import UnauthenticatedBanner from "@/components/chatbot/UnauthenticatedBanner";
import type {
  Message,
  ChatSession,
  ModelInfo,
  ContentPart,
} from "@/components/chatbot/types";
import { TOOLS_CONFIG } from "@/config/tools";
import ToolHeader from "@/components/ToolHeader";

const isLocal = process.env.NEXT_PUBLIC_LOCAL === "true";

type Repo = { label: string; path: string };

function ChatbotInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: authSession, status: authStatus } = useSession();
  const isOwner =
    authSession?.user?.email === process.env.NEXT_PUBLIC_OWNER_EMAIL;
  const isAuthenticated = !!authSession;

  const [repos, setRepos] = useState<Repo[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [repoPath, setRepoPath] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [showFileTree, setShowFileTree] = useState(false);
  const [injectedFiles, setInjectedFiles] = useState<Set<string>>(new Set());
  const [contextInfo, setContextInfo] = useState<{
    fileCount: number;
    tokens: number;
  } | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [noModelsAvailable, setNoModelsAvailable] = useState(false);
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const initDoneRef = useRef(false);

  const hasUnsavedMessages = !isAuthenticated && messages.length > 0;
  const sessionStarted = !!activeSession;
  const allModelsExhausted =
    models.length > 0 && models.every((m) => m.exhausted);

  const toolConfig = TOOLS_CONFIG.find((t) => t.href === "/tools/chatbot");

  useEffect(() => {
    if (userScrolledUp) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, userScrolledUp]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    function onScroll() {
      if (!el) return;
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setUserScrolledUp(distFromBottom > 80);
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!hasUnsavedMessages) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "You're not signed in; your messages will be lost.";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedMessages]);

  useEffect(() => {
    if (isLocal) {
      fetch("/api/briefer/files")
        .then((r) => r.json())
        .then((d) => {
          if (d.repos) setRepos(d.repos);
        })
        .catch(() => {});
    }
    fetch("/api/chat/models")
      .then((r) => r.json())
      .then((d) => {
        if (d.models?.length > 0) setModels(d.models);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    function handlePaste(e: ClipboardEvent) {
      if (!e.clipboardData) return;
      const items = Array.from(e.clipboardData.items);
      const imageItem = items.find((item) => item.type.startsWith("image/"));
      if (!imageItem) return;
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setPendingImage(reader.result as string);
      reader.readAsDataURL(file);
    }
    textarea.addEventListener("paste", handlePaste);
    return () => textarea.removeEventListener("paste", handlePaste);
  }, []);

  const loadSessions = useCallback(async () => {
    const res = await fetch("/api/chat/sessions");
    if (!res.ok) return [];
    const data = await res.json();
    setSessions(data.sessions ?? []);
    return data.sessions ?? [];
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    setLoadingSession(true);
    const res = await fetch(`/api/chat/sessions/${sessionId}`);
    if (!res.ok) {
      setLoadingSession(false);
      return;
    }
    const data = await res.json();
    const rawMsgs: Message[] = data.messages ?? [];
    const msgs: Message[] = [];
    for (const m of rawMsgs) {
      msgs.push(m);
      if (m.role === "system") {
        const text = typeof m.content === "string" ? m.content : "";
        const fileCount = (text.match(/# FILE:/g) ?? []).length;
        msgs.push({
          role: "assistant",
          content: `[Context loaded: ${fileCount} file(s)]`,
        });
      }
    }
    setMessages(msgs);
    setUserScrolledUp(false);
    setLimitReached(rawMsgs.length >= 100);
    if (data.session) {
      setActiveSession(data.session);
      setRepoPath(data.session.repo_path ?? null);
      if (data.session.model) setSelectedModel(data.session.model);
    }
    setLoadingSession(false);
  }, []);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (initDoneRef.current) return;
    async function init() {
      initDoneRef.current = true;
      const paramId = searchParams.get("session");
      if (paramId) {
        await loadSession(paramId);
        await loadSessions();
        return;
      }
      await loadSessions();
    }
    init();
  }, [authStatus, loadSession, loadSessions, searchParams]);

  async function createSession(
    firstMessage: string,
    rp: string | null,
    model: string,
  ): Promise<ChatSession | null> {
    const res = await fetch("/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: firstMessage.slice(0, 60),
        repo_path: rp,
        model,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.session;
  }

  async function saveMessage(
    sessionId: string,
    role: string,
    content: string,
  ): Promise<boolean> {
    const res = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, content }),
    });
    if (res.status === 429) {
      setLimitReached(true);
      return false;
    }
    return res.ok;
  }

  async function handleInjectContext(
    files: { path: string; content: string }[],
    tokens: number,
  ) {
    setShowFileTree(false);
    setContextInfo({ fileCount: files.length, tokens });
    setInjectedFiles((prev) => new Set([...prev, ...files.map((f) => f.path)]));
    const systemContent = files
      .map((f) => `# FILE: ${f.path}\n${f.content}`)
      .join("\n\n---\n\n");
    const tokenLabel =
      tokens < 1000
        ? `${tokens} tokens`
        : `~${Math.round(tokens / 1000)}k tokens`;
    const noteMsg: Message = {
      role: "assistant",
      content: `[Context loaded: ${files.length} file(s), ${tokenLabel}]`,
    };
    const systemMsg: Message = { role: "system", content: systemContent };
    let session = activeSession;
    if (!session && isOwner) {
      session = await createSession(
        "Context: " + files.map((f) => f.path.split("/").pop()).join(", "),
        repoPath,
        selectedModel,
      );
      if (session) {
        setActiveSession(session);
        setSessions((prev) => [session!, ...prev]);
        router.replace(`/tools/chatbot?session=${session.id}`);
      }
    }
    if (session) await saveMessage(session.id, "system", systemContent);
    setMessages((prev) => [...prev, systemMsg, noteMsg]);
  }

  function handleImageAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPendingImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleSend() {
    const text = input.trim();
    if ((!text && !pendingImage) || streaming || limitReached) return;
    setInput("");
    setStreaming(true);
    setNoModelsAvailable(false);
    setUserScrolledUp(false);

    const userContent: ContentPart[] | string = pendingImage
      ? [
          ...(text ? [{ type: "text" as const, text }] : []),
          { type: "image_url" as const, image_url: { url: pendingImage } },
        ]
      : text;
    setPendingImage(null);

    let session = activeSession;
    if (!session) {
      session = await createSession(text || "Image", repoPath, selectedModel);
      if (session) {
        setActiveSession(session);
        if (isOwner) {
          setSessions((prev) => [session!, ...prev]);
          router.replace(`/tools/chatbot?session=${session.id}`);
        }
      }
    }

    if (session) {
      const saved = await saveMessage(session.id, "user", text || "[image]");
      if (!saved) {
        setStreaming(false);
        return;
      }
    }

    const userMsg: Message = { role: "user", content: userContent };
    const sendMessages = messages
      .filter(
        (m) =>
          !(
            m.role === "assistant" &&
            typeof m.content === "string" &&
            m.content.startsWith("[Context loaded")
          ),
      )
      .concat(userMsg)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages([...messages, userMsg]);
    const assistantIndex = messages.length + 1;
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: sendMessages,
          model: session?.model ?? selectedModel,
        }),
        signal: controller.signal,
      });

      if (res.status === 503) {
        setNoModelsAvailable(true);
        setMessages((prev) => {
          const updated = [...prev];
          updated[assistantIndex] = {
            role: "assistant",
            content: "No models available.",
          };
          return updated;
        });
        setStreaming(false);
        return;
      }

      if (!res.ok || !res.body) throw new Error("request failed");

      const usedModel = res.headers.get("X-Model-Used") ?? "";
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[assistantIndex] = {
            role: "assistant",
            content: accumulated,
            modelUsed: usedModel,
          };
          return updated;
        });
      }

      if (session) await saveMessage(session.id, "assistant", accumulated);
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        setMessages((prev) => {
          const updated = [...prev];
          updated[assistantIndex] = {
            role: "assistant",
            content: "Error: could not reach LLM.",
          };
          return updated;
        });
      }
    } finally {
      abortRef.current = null;
      setStreaming(false);
      textareaRef.current?.focus();
    }
  }

  async function handleNewSession() {
    setActiveSession(null);
    setMessages([]);
    setLimitReached(false);
    setRepoPath(null);
    setContextInfo(null);
    setInjectedFiles(new Set());
    setPendingImage(null);
    setNoModelsAvailable(false);
    setUserScrolledUp(false);
    setSelectedModel("");
    if (isOwner) router.replace("/tools/chatbot");
    setMobileDrawerOpen(false);
  }

  async function handleSelectSession(s: ChatSession) {
    router.replace(`/tools/chatbot?session=${s.id}`);
    await loadSession(s.id);
    setContextInfo(null);
    setMobileDrawerOpen(false);
  }

  async function handleDeleteSession(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    await fetch(`/api/chat/sessions/${id}`, { method: "DELETE" });
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    if (activeSession?.id === id) {
      setActiveSession(null);
      setMessages([]);
      setRepoPath(null);
      setContextInfo(null);
      router.replace("/tools/chatbot");
    }
  }

  const isFromCodeBriefer = !!activeSession?.repo_path;
  const repoLabel =
    repos.find((r) => r.path === (activeSession?.repo_path ?? repoPath))
      ?.label ??
    (activeSession?.repo_path ?? repoPath)?.split("/").pop() ??
    null;
  const modelLabel = activeSession?.model ?? (selectedModel || null);

  return (
    <>
      <style>{markdownStyles}</style>
      <div className="flex-1 flex flex-col min-h-0 gap-3">
        <div className="flex items-end justify-between gap-4 flex-wrap flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="sm:hidden flex items-center justify-center rounded-lg"
              style={{
                width: 32,
                height: 32,
                background: "var(--border)",
                color: "var(--secondary)",
              }}
              aria-label="Open sessions"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 4h12M2 8h12M2 12h12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <ToolHeader
              title="Chatbot"
              subtitle="Chat with a local or hosted LLM."
              mediumUrl={toolConfig?.mediumUrl}
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {allModelsExhausted && (
              <span
                className="text-xs font-mono px-2 py-1 rounded"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  color: "rgb(239,68,68)",
                }}
              >
                No models available
              </span>
            )}

            {!sessionStarted && models.length > 0 && (
              <select
                className="input-base text-xs py-1.5"
                style={{ width: 220 }}
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                <option value="">LLM Model: Auto</option>
                {models.map((m) => (
                  <option key={m.name} value={m.name} disabled={m.exhausted}>
                    {m.name}
                    {m.exhausted ? " (exhausted)" : ""}
                  </option>
                ))}
              </select>
            )}

            {sessionStarted && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {repoLabel && (
                  <span
                    className="text-xs font-mono px-2 py-1 rounded"
                    style={{
                      background: "var(--accent-dim)",
                      color: "var(--accent)",
                    }}
                  >
                    {repoLabel}
                  </span>
                )}
                {modelLabel && (
                  <span
                    className="text-xs font-mono px-2 py-1 rounded"
                    style={{
                      background: "var(--border)",
                      color: "var(--secondary)",
                    }}
                  >
                    {modelLabel}
                  </span>
                )}
              </div>
            )}

            {!sessionStarted &&
              isLocal &&
              repos.length > 0 &&
              isOwner &&
              !isFromCodeBriefer && (
                <select
                  className="input-base text-xs py-1.5"
                  style={{ width: 160 }}
                  value={repoPath ?? ""}
                  onChange={(e) => setRepoPath(e.target.value || null)}
                >
                  <option value="">No repo</option>
                  {repos.map((r) => (
                    <option key={r.path} value={r.path}>
                      {r.label}
                    </option>
                  ))}
                </select>
              )}

            {isLocal && repoPath && isOwner && (
              <button
                onClick={() => setShowFileTree(true)}
                className="btn-ghost text-xs py-1 px-3"
              >
                {contextInfo
                  ? `Context: ${contextInfo.fileCount} files`
                  : "Load Context"}
              </button>
            )}
            <button onClick={handleNewSession} className="btn-primary text-sm">
              + New Chat
            </button>
          </div>
        </div>

        {authStatus !== "loading" && !isAuthenticated && (
          <UnauthenticatedBanner hasMessages={hasUnsavedMessages} />
        )}

        <div className="flex-1 flex gap-4 min-h-0">
          <div className="hidden sm:flex flex-col gap-1 flex-shrink-0 w-48 min-h-0">
            <SessionList
              sessions={sessions}
              activeSession={activeSession}
              onSelect={handleSelectSession}
              onDelete={handleDeleteSession}
            />
          </div>

          {mobileDrawerOpen && (
            <div className="sm:hidden fixed inset-0 z-50 flex">
              <div
                className="flex-1 bg-black/50"
                onClick={() => setMobileDrawerOpen(false)}
              />
              <div
                className="w-64 flex flex-col gap-2 p-4"
                style={{
                  background: "var(--surface)",
                  borderLeft: "1px solid var(--border)",
                }}
              >
                <div className="flex items-center justify-between flex-shrink-0">
                  <p
                    className="text-xs font-mono"
                    style={{ color: "var(--muted)" }}
                  >
                    Sessions
                  </p>
                  <button
                    onClick={() => setMobileDrawerOpen(false)}
                    className="text-xs px-2 py-1 rounded"
                    style={{
                      background: "var(--border)",
                      color: "var(--secondary)",
                    }}
                  >
                    ✕
                  </button>
                </div>
                <button
                  onClick={handleNewSession}
                  className="btn-primary text-xs py-1.5 flex-shrink-0"
                >
                  + New Chat
                </button>
                <SessionList
                  sessions={sessions}
                  activeSession={activeSession}
                  onSelect={handleSelectSession}
                  onDelete={handleDeleteSession}
                />
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto rounded-xl border mb-3 p-4 space-y-4"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
              }}
            >
              {loadingSession ? (
                <div className="h-full flex items-center justify-center">
                  <p
                    className="text-xs font-mono"
                    style={{ color: "var(--muted)" }}
                  >
                    Loading…
                  </p>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p
                    className="text-sm font-mono"
                    style={{ color: "var(--muted)" }}
                  >
                    {activeSession ? "No messages yet" : "Start a new chat…"}
                  </p>
                </div>
              ) : (
                messages.map((m, i) => (
                  <MessageBubble key={i} message={m} repoPath={repoPath} />
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {limitReached && (
              <p
                className="text-xs font-mono text-center mb-2 flex-shrink-0"
                style={{ color: "rgb(239,68,68)" }}
              >
                Message limit reached (100). Start a new chat.
              </p>
            )}
            {noModelsAvailable && (
              <p
                className="text-xs font-mono text-center mb-2 flex-shrink-0"
                style={{ color: "rgb(239,68,68)" }}
              >
                No models available. All quota exhausted, resets at{" "}
                {process.env.NEXT_PUBLIC_WIB_RESET_HOUR ?? "8"} AM WIB.
              </p>
            )}

            {pendingImage && (
              <div className="flex items-center gap-2 mb-2 px-2 flex-shrink-0">
                <img
                  src={pendingImage}
                  alt="pending"
                  className="rounded-lg"
                  style={{ height: 48, width: 48, objectFit: "cover" }}
                />
                <button
                  onClick={() => setPendingImage(null)}
                  className="text-xs font-mono px-1.5 py-0.5 rounded"
                  style={{ color: "var(--muted)", background: "var(--border)" }}
                >
                  ✕
                </button>
              </div>
            )}

            <div
              className="rounded-xl border flex items-end gap-2 p-2 flex-shrink-0"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
              }}
            >
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageAttach}
              />
              <button
                onClick={() => imageInputRef.current?.click()}
                className="flex-shrink-0 p-2 rounded-lg transition-colors"
                style={{
                  color: pendingImage ? "var(--accent)" : "var(--muted)",
                  background: pendingImage
                    ? "var(--accent-dim)"
                    : "transparent",
                }}
                disabled={streaming || limitReached}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect
                    x="1"
                    y="3"
                    width="14"
                    height="10"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.25"
                  />
                  <circle
                    cx="5.5"
                    cy="6.5"
                    r="1.25"
                    stroke="currentColor"
                    strokeWidth="1.25"
                  />
                  <path
                    d="M1 11l3.5-3.5L7 10l3-3 5 4"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <textarea
                ref={textareaRef}
                className="input-base flex-1 resize-none"
                style={{
                  border: "none",
                  background: "transparent",
                  minHeight: 40,
                  maxHeight: 160,
                }}
                rows={1}
                placeholder={
                  limitReached
                    ? "Limit reached; start a new chat"
                    : allModelsExhausted
                      ? `No models available; resets at ${process.env.NEXT_PUBLIC_WIB_RESET_HOUR ?? "8"} AM WIB`
                      : "Type a message… (Enter to send, Shift+Enter for newline)"
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={streaming || limitReached || allModelsExhausted}
              />

              {streaming ? (
                <button
                  onClick={() => abortRef.current?.abort()}
                  className="btn-ghost py-2 px-4 flex-shrink-0 text-sm"
                  style={{
                    color: "rgb(239,68,68)",
                    borderColor: "rgb(239,68,68)",
                  }}
                >
                  ✕ Stop
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={
                    (!input.trim() && !pendingImage) ||
                    limitReached ||
                    allModelsExhausted
                  }
                  className="btn-primary py-2 px-4 flex-shrink-0"
                  style={{
                    opacity:
                      (!input.trim() && !pendingImage) ||
                      limitReached ||
                      allModelsExhausted
                        ? 0.5
                        : 1,
                  }}
                >
                  Send
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {isLocal && showFileTree && repoPath && (
        <RepoFileTree
          repoPath={repoPath}
          onInject={handleInjectContext}
          onClose={() => setShowFileTree(false)}
          injectLabel="Inject Context"
          initialSelected={injectedFiles}
        />
      )}
    </>
  );
}

export default function ChatbotPage() {
  return (
    <Suspense>
      <ChatbotInner />
    </Suspense>
  );
}
