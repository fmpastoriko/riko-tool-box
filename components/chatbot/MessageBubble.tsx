"use client";

import CopyButton from "./CopyButton";
import ApplyButton from "./ApplyButton";
import MarkdownContent from "@/components/MarkdownContent";
import { messageText, type Message } from "./types";

const isLocal = process.env.NEXT_PUBLIC_LOCAL === "true";

export const markdownStyles = `
  .markdown-body ul { list-style-type: disc; padding-left: 20px; margin: 4px 0; }
  .markdown-body ol { list-style-type: decimal; padding-left: 20px; margin: 4px 0; }
  .markdown-body li { margin: 2px 0; }
  .markdown-body p { margin: 0 0 4px 0; }
  .markdown-body h1, .markdown-body h2, .markdown-body h3 { font-weight: 600; margin: 6px 0 2px 0; }
`;

export default function MessageBubble({
  message,
  repoPath,
}: {
  message: Message;
  repoPath: string | null;
}) {
  if (message.role === "system") return null;

  const text = messageText(message.content);
  const isContextNote = text.startsWith("[Context loaded");
  const imagePart = Array.isArray(message.content)
    ? (message.content.find((p) => p.type === "image_url") as
        | { type: "image_url"; image_url: { url: string } }
        | undefined)
    : undefined;

  return (
    <div
      className={`flex group items-start gap-1.5 ${message.role === "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed${message.role === "user" || isContextNote ? " whitespace-pre-wrap" : ""}`}
        style={
          isContextNote
            ? {
                background: "var(--accent-dim)",
                color: "var(--accent)",
                borderRadius: 8,
                fontSize: 11,
                fontFamily: "monospace",
              }
            : message.role === "user"
              ? {
                  background: "var(--accent)",
                  color: "#fff",
                  borderBottomRightRadius: 4,
                }
              : {
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  color: "var(--secondary)",
                  borderBottomLeftRadius: 4,
                }
        }
      >
        {imagePart && (
          <img
            src={imagePart.image_url.url}
            alt="attached"
            className="rounded-lg mb-2 max-w-full"
            style={{ maxHeight: 240, objectFit: "contain" }}
          />
        )}

        {!text && !imagePart ? (
          <span className="flex gap-1 items-center">
            {[0, 150, 300].map((d) => (
              <span
                key={d}
                className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ background: "var(--muted)", animationDelay: `${d}ms` }}
              />
            ))}
          </span>
        ) : message.role === "assistant" && !isContextNote ? (
          <div
            className="text-sm leading-relaxed markdown-body"
            style={{ color: "inherit" }}
          >
            <MarkdownContent text={text} />
          </div>
        ) : (
          text
        )}

        {isLocal &&
          message.role === "assistant" &&
          text &&
          repoPath &&
          !isContextNote && <ApplyButton content={text} repoPath={repoPath} />}

        {message.role === "assistant" &&
          message.modelUsed &&
          !isContextNote && (
            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
              <span
                className="text-xs font-mono px-1.5 py-0.5 rounded"
                style={{
                  background: "rgba(0,0,0,0.08)",
                  color: "var(--muted)",
                  fontSize: 10,
                }}
              >
                {message.modelUsed}
              </span>
            </div>
          )}

        {text && !isContextNote && (
          <div
            style={{
              marginTop: 6,
              textAlign: message.role === "user" ? "right" : "left",
            }}
          >
            <CopyButton text={text} />
          </div>
        )}
      </div>
    </div>
  );
}
