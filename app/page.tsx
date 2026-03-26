"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Timeline from "@/components/Timeline";
import Link from "next/link";
import { TOOLS_CONFIG, MAX_HIGHLIGHTED } from "@/config/tools";
import { ToolIcon } from "@/components/ToolIcon";
import SectionLabel from "@/components/SectionLabel";

const is_local = process.env.NEXT_PUBLIC_LOCAL === "true";

const BIO_TEXT =
  "Welcome! This site is meant as a showcase for my work and my capability, while also as my personal tool-box.\nMost of these tools were originally built for my own use, so things might feel a bit jumbled lol.\nStill, I hope they give a good sense of what I can do as a Software Engineer, Data Engineer, and/or Data Analyst.";

const WARNING_TEXT =
  "WARNING!!! For demo/portfolio purpose only. Don't enter sensitive data. For real use, run it locally (clone the repo). Reach out if you need help.";

const highlightedTools = TOOLS_CONFIG.filter(
  (t) => t.highlight && (!t.localOnly || is_local),
).slice(0, MAX_HIGHLIGHTED);

const fillerCount = Math.max(0, 3 - highlightedTools.length);

function ToolGrid() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-2 gap-1.5">
        {highlightedTools.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="block rounded-xl transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--accent)]"
          >
            <div
              className="flex flex-col items-center justify-center gap-1.5 rounded-xl border transition-all duration-150"
              style={{
                height: 72,
                background: "var(--surface)",
                borderColor: "var(--border)",
                color: "var(--accent)",
              }}
            >
              <ToolIcon type={t.icon} size={22} />
              <span
                className="font-mono text-center leading-tight px-1"
                style={{ color: "var(--secondary)", fontSize: 10 }}
              >
                {t.label}
              </span>
            </div>
          </Link>
        ))}
        {Array.from({ length: fillerCount }).map((_, i) => (
          <div key={`filler-${i}`}>
            <div
              className="flex flex-col items-center justify-center gap-1.5 rounded-xl border transition-all duration-150"
              style={{
                height: 72,
                background: "var(--bg)",
                borderColor: "var(--border)",
                color: "var(--muted)",
                opacity: 0.4,
              }}
            >
              <ToolIcon type="comingsoon" size={22} />
              <span
                className="font-mono text-center leading-tight px-1"
                style={{ color: "var(--muted)", fontSize: 10 }}
              >
                Coming Soon
              </span>
            </div>
          </div>
        ))}
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

function ToolGridMobile() {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        {highlightedTools.map((t) => (
          <Link key={t.href} href={t.href} style={{ display: "block" }}>
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
          </Link>
        ))}
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
          <SectionLabel noMargin>Experience</SectionLabel>
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
          className="flex flex-col gap-4 flex-shrink-0 overflow-y-auto"
          style={{ width: 360 }}
        >
          <div className="flex items-start gap-4 flex-shrink-0">
            <img
              src="/prof-pic.jpg"
              alt="Riko"
              className="w-28 h-28 rounded-2xl object-cover flex-shrink-0"
            />
            <div className="min-w-0">
              <SectionLabel>{"Hello, I'm"}</SectionLabel>
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
            className="text-base leading-relaxed whitespace-pre-line flex-shrink-0"
            style={{ color: "var(--secondary)" }}
          >
            {BIO_TEXT}
            {!is_local && (
              <div style={{ marginTop: 10, color: "red", fontWeight: "bold" }}>
                {WARNING_TEXT}
              </div>
            )}
          </div>
          <div className="flex-shrink-0">
            <SectionLabel className="mb-2">Toolbox</SectionLabel>
            <ToolGrid />
          </div>
        </div>
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <div className="flex items-baseline gap-2 mb-3 flex-shrink-0">
            <SectionLabel noMargin>Experience</SectionLabel>
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
              <SectionLabel>{"Hello, I'm"}</SectionLabel>
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
          <SectionLabel className="mb-2">Toolbox</SectionLabel>
          <ToolGridMobile />
        </section>
        <section className="flex flex-col flex-1 min-h-0">
          <div className="flex items-baseline gap-2 mb-3 flex-shrink-0">
            <SectionLabel noMargin>Experience</SectionLabel>
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
