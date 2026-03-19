"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const TOOLS = [
  { href: "/tools/chatbot", label: "Chatbot" },
  { href: "/tools/code-briefer", label: "Code Briefer" },
  { href: "/tools/text-compare", label: "Text Compare" },
];

const SIDEBAR_WIDTH = 180;
const TAB_WIDTH = 18;

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);

  const isHistory =
    pathname.includes("/history") ||
    (!pathname.endsWith("/chatbot") &&
      !pathname.endsWith("/code-briefer") &&
      !pathname.endsWith("/text-compare") &&
      pathname !== "/tools");

  return (
    <>
      <div
        className="hidden sm:flex"
        style={{ height: "calc(100vh - 3.5rem)", overflow: "hidden" }}
      >
        <div
          className="flex flex-col flex-shrink-0 pt-6 pb-4 px-3 gap-1"
          style={{
            width: open ? SIDEBAR_WIDTH : 0,
            minWidth: open ? SIDEBAR_WIDTH : 0,
            background: "var(--surface)",
            borderRight: open ? "1px solid var(--border)" : "none",
            transition: "width 0.2s, min-width 0.2s",
            overflow: "hidden",
          }}
        >
          <p
            className="text-xs font-mono px-2 mb-2 flex-shrink-0"
            style={{ color: "var(--muted)" }}
          >
            Tools
          </p>
          {TOOLS.map((t) => {
            const active = pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className="text-xs font-mono px-3 py-2 rounded-lg transition-all flex-shrink-0 whitespace-nowrap"
                style={{
                  background: active ? "var(--accent-dim)" : "transparent",
                  color: active ? "var(--accent)" : "var(--secondary)",
                  border: `1px solid ${active ? "var(--accent)" : "transparent"}`,
                }}
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="fixed top-1/2 -translate-y-1/2 z-50 flex items-center justify-center flex-shrink-0"
          style={{
            left: open ? SIDEBAR_WIDTH : 0,
            width: TAB_WIDTH,
            height: 64,
            background: "var(--border)",
            borderRadius: "0 6px 6px 0",
            color: "var(--muted)",
            fontSize: 10,
            writingMode: "vertical-rl",
            letterSpacing: "0.05em",
            cursor: "pointer",
            border: "1px solid var(--border)",
            borderLeft: "none",
            transition: "left 0.2s",
            zIndex: 50,
          }}
          title={open ? "Close tools" : "Open tools"}
          aria-label="Toggle tool sidebar"
        >
          {open ? "✕" : "⇢"}
        </button>

        <div
          className="flex-1 min-w-0 px-6 py-6 flex flex-col"
          style={{
            marginLeft: TAB_WIDTH,
            overflow: isHistory ? "auto" : "hidden",
          }}
        >
          {children}
        </div>
      </div>

      <div
        className="sm:hidden flex flex-col"
        style={{ height: "calc(100vh - 3.5rem)" }}
      >
        {children}
      </div>
    </>
  );
}
