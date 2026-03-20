"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import ScreenshotSlot from "./ScreenshotSlot";
import { parseLinks } from "./parseLinks";
import type { TimelineEntry } from "@/data/timeline";

const TYPE_COLOR: Record<string, string> = {
  DA: "rgba(59,130,246,0.15)",
  DE: "rgba(34,197,94,0.15)",
  SWE: "rgba(109,87,248,0.15)",
};

const TYPE_TEXT: Record<string, string> = {
  DA: "rgb(59,130,246)",
  DE: "rgb(34,197,94)",
  SWE: "var(--accent)",
};

const ARCH_LABEL: Record<string, string> = {
  DA: "Research / Analytical Flow",
  DE: "Data Pipeline",
  SWE: "Tech Stack",
};

export default function TimelineModal({
  entry,
  onClose,
}: {
  entry: TimelineEntry;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          width: "100%",
          maxWidth: 760,
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "1.5rem",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            fontFamily: "monospace",
            fontSize: 13,
            padding: "4px 10px",
            borderRadius: 8,
            background: "var(--border)",
            color: "var(--secondary)",
            border: "none",
            cursor: "pointer",
          }}
        >
          ✕ close
        </button>

        <div className="flex items-center gap-2 mb-1">
          <p className="section-label mb-0">{entry.year}</p>
          <span
            className="text-xs font-mono px-2 py-0.5 rounded-full"
            style={{
              background: TYPE_COLOR[entry.type],
              color: TYPE_TEXT[entry.type],
            }}
          >
            {entry.type}
          </span>
        </div>

        <h2
          className="text-xl font-semibold mb-0.5"
          style={{ color: "var(--primary)" }}
        >
          {entry.role}
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--secondary)" }}>
          {entry.company}
        </p>

        <div className="grid grid-cols-3 gap-2 mb-5">
          {(["a", "b", "c"] as const).map((suffix) => (
            <ScreenshotSlot
              key={suffix}
              src={`/timeline/${entry.id}-${suffix}`}
              alt={`${entry.role} - ${entry.company}`}
            />
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <p className="section-label">Problem</p>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--secondary)" }}
            >
              {entry.problem}
            </p>
          </div>

          <div>
            <p className="section-label">What I Built</p>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--secondary)" }}
            >
              {parseLinks(entry.whatIBuilt)}
            </p>
          </div>

          <div>
            <p className="section-label">{ARCH_LABEL[entry.type]}</p>
            {entry.type === "SWE" ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {entry.architecture.map((item, i) => (
                  <span
                    key={i}
                    className="font-mono text-xs sm:text-sm px-3 py-1 rounded"
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      color: "var(--primary)",
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-start gap-0.5 mt-2">
                {entry.architecture.map((step, i) => (
                  <div key={i} className="flex flex-col items-start">
                    <span
                      className="font-mono text-xs sm:text-sm px-3 py-1 rounded"
                      style={{
                        background: "var(--bg)",
                        border: "1px solid var(--border)",
                        color: "var(--primary)",
                      }}
                    >
                      {step}
                    </span>
                    {i < entry.architecture.length - 1 && (
                      <span
                        className="ml-4 text-xs leading-none my-0.5"
                        style={{ color: "var(--muted)" }}
                      >
                        ↓
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="section-label">Impact</p>
            <ul className="space-y-1">
              {entry.impact.map((item, i) => (
                <li
                  key={i}
                  className="text-sm flex gap-2"
                  style={{ color: "var(--secondary)" }}
                >
                  <span
                    style={{ color: "var(--accent)" }}
                    className="flex-shrink-0"
                  >
                    ▸
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {entry.note && (
            <div>
              <p className="section-label">Note</p>
              <p
                className="text-sm leading-relaxed italic"
                style={{ color: "var(--muted)" }}
              >
                {parseLinks(entry.note)}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 pt-1">
            {entry.tech.map((t) => (
              <span key={t} className="tag">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
