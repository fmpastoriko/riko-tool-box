"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Timeline from "@/components/Timeline";
import Link from "next/link";

const is_local = process.env.NEXT_PUBLIC_LOCAL === "true";

const BIO_TEXT =
  "Welcome! This site is meant as a showcase for my work and my capability, while also as my personal tool-box.\nMost of these tools were originally built for my own use, so things might feel a bit jumbled lol.\nStill, I hope they give a good sense of what I can do as a Software Engineer, Data Engineer, and/or Data Analyst.";

const WARNING_TEXT =
  "WARNING!!! For demo/portfolio purpose only. Don’t enter sensitive data. For real use, run it locally (clone the repo). Reach out if you need help.";

type IconType =
  | "chatbot"
  | "codebriefer"
  | "textcompare"
  | "comingsoon"
  | "alltools";

function ToolIcon({ type, size = 22 }: { type: IconType; size?: number }) {
  if (type === "chatbot")
    return (
      <svg width={size} height={size} viewBox="0 0 26 26" fill="none">
        <rect
          x="2"
          y="3"
          width="22"
          height="14"
          rx="4"
          fill="currentColor"
          opacity="0.9"
        />
        <circle cx="8.5" cy="10" r="1.6" fill="white" />
        <circle cx="13" cy="10" r="1.6" fill="white" />
        <circle cx="17.5" cy="10" r="1.6" fill="white" />
        <path
          d="M9.5 17l2 3.5L13 18l1.5 2.5 2-3.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
      </svg>
    );
  if (type === "codebriefer")
    return (
      <svg width={size} height={size} viewBox="0 0 26 26" fill="none">
        <rect
          x="2"
          y="2"
          width="22"
          height="22"
          rx="4"
          fill="currentColor"
          opacity="0.9"
        />
        <path
          d="M8.5 9.5L6 12 8.5 14.5"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M17.5 9.5L20 12 17.5 14.5"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15 7l-4 12"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  if (type === "textcompare")
    return (
      <svg width={size} height={size} viewBox="0 0 26 26" fill="none">
        <rect
          x="2"
          y="2"
          width="10"
          height="22"
          rx="3"
          fill="currentColor"
          opacity="0.9"
        />
        <rect
          x="14"
          y="2"
          width="10"
          height="22"
          rx="3"
          fill="currentColor"
          opacity="0.4"
        />
        <path
          d="M5.5 8h5M5.5 11.5h3.5M5.5 15h5M5.5 18.5h2.5"
          stroke="white"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="M17 8h4M17 11.5h2.5M17 15h4M17 18.5h3"
          stroke="white"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.7"
        />
      </svg>
    );
  if (type === "alltools")
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        <rect
          x="1"
          y="1"
          width="7.5"
          height="7.5"
          rx="2.5"
          fill="currentColor"
          opacity="0.9"
        />
        <rect
          x="11.5"
          y="1"
          width="7.5"
          height="7.5"
          rx="2.5"
          fill="currentColor"
          opacity="0.9"
        />
        <rect
          x="1"
          y="11.5"
          width="7.5"
          height="7.5"
          rx="2.5"
          fill="currentColor"
          opacity="0.9"
        />
        <rect
          x="11.5"
          y="11.5"
          width="7.5"
          height="7.5"
          rx="2.5"
          fill="currentColor"
          opacity="0.9"
        />
      </svg>
    );
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none">
      <rect
        x="2"
        y="2"
        width="22"
        height="22"
        rx="4"
        fill="currentColor"
        opacity="0.12"
      />
      <circle cx="13" cy="13" r="2" fill="currentColor" opacity="0.2" />
      <circle cx="7.5" cy="13" r="1.5" fill="currentColor" opacity="0.15" />
      <circle cx="18.5" cy="13" r="1.5" fill="currentColor" opacity="0.15" />
    </svg>
  );
}

const TOOL_SLOTS: {
  href: string | null;
  label: string;
  icon: IconType;
  active: boolean;
}[] = [
  { href: "/tools/chatbot", label: "Chatbot", icon: "chatbot", active: true },
  {
    href: "/tools/code-briefer",
    label: "Code Briefer",
    icon: "codebriefer",
    active: true,
  },
  {
    href: "/tools/text-compare",
    label: "Text Compare",
    icon: "textcompare",
    active: true,
  },
  { href: null, label: "Coming Soon", icon: "comingsoon", active: false },
  { href: null, label: "Coming Soon", icon: "comingsoon", active: false },
  { href: null, label: "Coming Soon", icon: "comingsoon", active: false },
];

function ToolGrid() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-2 gap-1.5">
        {TOOL_SLOTS.map((t, i) => {
          const inner = (
            <div
              className="flex flex-col items-center justify-center gap-1.5 rounded-xl border transition-all duration-150"
              style={{
                height: 72,
                background: t.active ? "var(--surface)" : "var(--bg)",
                borderColor: "var(--border)",
                color: t.active ? "var(--accent)" : "var(--muted)",
                opacity: t.active ? 1 : 0.4,
              }}
            >
              <ToolIcon type={t.icon} size={22} />
              <span
                className="font-mono text-center leading-tight px-1"
                style={{
                  color: t.active ? "var(--secondary)" : "var(--muted)",
                  fontSize: 10,
                }}
              >
                {t.label}
              </span>
            </div>
          );
          return t.href ? (
            <Link
              key={i}
              href={t.href}
              className="block rounded-xl transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--accent)]"
            >
              {inner}
            </Link>
          ) : (
            <div key={i}>{inner}</div>
          );
        })}
      </div>
      <Link
        href="/tools"
        className="flex items-center justify-center gap-2 rounded-xl border px-3 py-2 transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--accent)]"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <span style={{ color: "var(--accent)" }}>
          <ToolIcon type="alltools" size={16} />
        </span>
        <span
          className="text-xs font-mono"
          style={{ color: "var(--secondary)" }}
        >
          Open All Tools
        </span>
      </Link>
    </div>
  );
}

const ACTIVE_TOOL_SLOTS = TOOL_SLOTS.filter((t) => t.active);

function ToolGridMobile() {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        {ACTIVE_TOOL_SLOTS.map((t, i) => {
          const inner = (
            <div
              className="flex flex-col items-center justify-center gap-1.5 rounded-xl border py-3 transition-all duration-150"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
                color: "var(--accent)",
              }}
            >
              <ToolIcon type={t.icon} size={20} />
              <span
                style={{
                  color: "var(--secondary)",
                  fontSize: 10,
                  fontFamily: "monospace",
                  textAlign: "center",
                  lineHeight: 1.2,
                  paddingLeft: 2,
                  paddingRight: 2,
                }}
              >
                {t.label}
              </span>
            </div>
          );
          return (
            <Link key={i} href={t.href!} style={{ display: "block" }}>
              {inner}
            </Link>
          );
        })}
      </div>
      <Link
        href="/tools"
        className="flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <span style={{ color: "var(--accent)" }}>
          <ToolIcon type="alltools" size={16} />
        </span>
        <span
          className="text-xs font-mono"
          style={{ color: "var(--secondary)" }}
        >
          Open All Tools
        </span>
      </Link>
    </div>
  );
}

function TimelineFullscreen({
  initialScroll,
  onClose,
}: {
  initialScroll: number;
  onClose: (scrollPos: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current && initialScroll > 0)
      scrollRef.current.scrollTop = initialScroll;
  }, [initialScroll]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onTouchStart(e: TouchEvent) {
      touchStartY.current = e.touches[0].clientY;
    }
    function onTouchMove(e: TouchEvent) {
      const dy = e.touches[0].clientY - touchStartY.current;
      const scrollTop = scrollRef.current?.scrollTop ?? 1;
      if (dy > 0 && scrollTop === 0) onClose(0);
    }
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, [onClose]);

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 8000,
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="flex items-baseline gap-2">
          <p className="section-label mb-0">Experience</p>
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--primary)" }}
          >
            Career Highlights
          </h2>
        </div>
        <button
          onClick={() => onClose(scrollRef.current?.scrollTop ?? 0)}
          className="text-xs font-mono px-3 py-1.5 rounded-lg"
          style={{ background: "var(--border)", color: "var(--secondary)" }}
        >
          ✕ close
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        <Timeline />
      </div>
    </div>,
    document.body,
  );
}

export default function HomePage() {
  const [timelineFullscreen, setTimelineFullscreen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const savedScrollPos = useRef(0);

  useEffect(() => {
    if (!timelineFullscreen && previewRef.current)
      previewRef.current.scrollTop = savedScrollPos.current;
  }, [timelineFullscreen]);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    function onTouchStart(e: TouchEvent) {
      touchStartY.current = e.touches[0].clientY;
    }
    function onTouchMove(e: TouchEvent) {
      const dy = e.touches[0].clientY - touchStartY.current;
      if (dy !== 0) setTimelineFullscreen(true);
    }
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  return (
    <>
      <div
        className="hidden sm:flex gap-6 px-6 py-6 animate-fade-in"
        style={{ height: "calc(100vh - 56px)", overflow: "hidden" }}
      >
        <div
          className="flex flex-col gap-4 flex-shrink-0"
          style={{ width: 360 }}
        >
          <div className="flex items-start gap-4">
            <img
              src="/prof-pic.jpg"
              alt="Riko"
              className="w-28 h-28 rounded-2xl object-cover flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="section-label">{"Hello, I'm"}</p>
              <h1
                className="text-2xl font-bold leading-tight"
                style={{ color: "var(--primary)" }}
              >
                F. M. Pastoriko
              </h1>
              <p className="text-sm mt-1" style={{ color: "var(--secondary)" }}>
                Software Engineer · Data Engineer · Data Analyst
              </p>
            </div>
          </div>
          <div
            className="text-base leading-relaxed whitespace-pre-line"
            style={{ color: "var(--secondary)" }}
          >
            {BIO_TEXT}
            {!is_local && (
              <div style={{ marginTop: 10, color: "red", fontWeight: "bold" }}>
                {WARNING_TEXT}
              </div>
            )}
          </div>
          <div>
            <p className="section-label mb-2">Toolbox</p>
            <ToolGrid />
          </div>
        </div>
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <div className="flex items-baseline gap-2 mb-3 flex-shrink-0">
            <p className="section-label mb-0">Experience</p>
            <h2
              className="text-2xl font-bold"
              style={{ color: "var(--primary)" }}
            >
              Career Highlights
            </h2>
          </div>
          <div
            className="flex-1 min-h-0 overflow-y-auto rounded-xl border"
            style={{
              borderColor: "var(--border)",
              background: "var(--bg)",
              padding: "1rem",
              paddingLeft: "1.625rem",
            }}
          >
            <Timeline />
          </div>
        </div>
      </div>

      <div
        className="sm:hidden flex flex-col px-4 py-4"
        style={{ height: "calc(100vh - 56px)" }}
      >
        <section className="animate-fade-in mb-4">
          <div className="flex flex-row gap-3 items-start mb-3">
            <img
              src="/prof-pic.jpg"
              alt="Riko"
              className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="section-label">{"Hello, I'm"}</p>
              <h1
                className="text-xl font-bold leading-tight"
                style={{ color: "var(--primary)" }}
              >
                F. M. Pastoriko (Riko)
              </h1>
              <p
                className="mt-0.5 text-xs"
                style={{ color: "var(--secondary)" }}
              >
                Software Engineer · Data Engineer · Data Analyst
              </p>
            </div>
          </div>
          <p
            className="leading-relaxed text-sm mb-4"
            style={{ color: "var(--secondary)" }}
          >
            {BIO_TEXT}
          </p>
          <p className="section-label mb-2">Toolbox</p>
          <ToolGridMobile />
        </section>
        <section className="flex flex-col flex-1 min-h-0">
          <div className="flex items-baseline gap-2 mb-3 flex-shrink-0">
            <p className="section-label mb-0">Experience</p>
            <h2
              className="text-lg font-semibold"
              style={{ color: "var(--primary)" }}
            >
              Career Highlights
            </h2>
          </div>
          <div
            ref={previewRef}
            className="flex-1 min-h-0 overflow-y-auto rounded-xl border pr-1"
            style={{
              borderColor: "var(--border)",
              background: "var(--bg)",
              padding: "0.75rem",
            }}
          >
            <div className="pointer-events-none">
              <Timeline />
            </div>
          </div>
        </section>
      </div>

      {timelineFullscreen && (
        <TimelineFullscreen
          initialScroll={savedScrollPos.current}
          onClose={(pos) => {
            savedScrollPos.current = pos;
            setTimelineFullscreen(false);
          }}
        />
      )}
    </>
  );
}
