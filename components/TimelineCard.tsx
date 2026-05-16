"use client";

import TimelineModal from "./timeline/TimelineModal";
import { parseLinks } from "./timeline/parseLinks";
import type { TimelineEntry } from "@/data/timeline";
import Card from "@/components/Card";
import SectionLabel from "@/components/SectionLabel";
import Tag from "@/components/Tag";

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

export default function TimelineCard({
  entry,
  open,
  onToggle,
}: {
  entry: TimelineEntry;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative pl-7">
      <div
        className="absolute left-0 top-2 w-3 h-3 rounded-full ring-4 ring-[var(--bg)]"
        style={{ background: "var(--accent)" }}
      />
      <div
        className="absolute left-1.5 top-5 bottom-0 w-px"
        style={{ background: "var(--border)" }}
      />

      <button onClick={onToggle} className="w-full text-left group mb-1">
        <Card
          style={{ borderColor: "var(--border)" }}
          className="transition-all duration-200 hover:border-[var(--accent)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <SectionLabel noMargin>{entry.year}</SectionLabel>
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
              <h3
                className="font-semibold text-base sm:text-lg truncate"
                style={{ color: "var(--primary)" }}
              >
                {entry.role}
              </h3>
              <p
                className="text-base mt-0.5"
                style={{ color: "var(--secondary)" }}
              >
                {entry.company}
              </p>
              <p
                className="text-base mt-2 leading-relaxed"
                style={{ color: "var(--muted)" }}
              >
                {parseLinks(entry.whatIBuilt)}
              </p>
              <p
                className="hidden sm:block text-base mt-1 leading-relaxed"
                style={{ color: "var(--muted)" }}
              >
                Impact: {entry.impactSummary}
              </p>
            </div>
            <span
              className="text-lg mt-0.5 flex-shrink-0"
              style={{ color: "var(--muted)" }}
            >
              ↗
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {entry.tech.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        </Card>
      </button>

      {open && <TimelineModal entry={entry} onClose={onToggle} />}
    </div>
  );
}
