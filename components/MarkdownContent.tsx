"use client";

import ReactMarkdown from "react-markdown";

export default function MarkdownContent({ text }: { text: string }) {
  return (
    <ReactMarkdown
      components={{
        code: ({ className, children }) => {
          const isBlock = String(children).includes("\n");
          return isBlock ? (
            <pre
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "8px 10px",
                overflowX: "auto",
                margin: "6px 0",
                fontSize: 12,
                fontFamily: "monospace",
                lineHeight: 1.5,
              }}
            >
              <code className={className} style={{ fontFamily: "monospace" }}>
                {children}
              </code>
            </pre>
          ) : (
            <code
              style={{
                background: "var(--border)",
                borderRadius: 3,
                padding: "1px 4px",
                fontSize: 12,
                fontFamily: "monospace",
              }}
            >
              {children}
            </code>
          );
        },
        strong: ({ children }) => (
          <strong style={{ fontWeight: 600 }}>{children}</strong>
        ),
        blockquote: ({ children }) => (
          <blockquote
            style={{
              borderLeft: "2px solid var(--accent)",
              paddingLeft: 10,
              margin: "4px 0",
              color: "var(--muted)",
              fontStyle: "italic",
            }}
          >
            {children}
          </blockquote>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
