"use client";
import Timeline from "@/components/Timeline";
import Link from "next/link";

const TOOLS = [
  { href: "/tools/text-compare", icon: "⇄", label: "Text Compare" },
  { href: "/tools", icon: "⊞", label: "Open All Tools" },
];

const BIO_TEXT =
  "Welcome! This site is meant as a showcase for my work and my capability, while also as my personal tool-box. Most of these tools were originally built for my own use, so things might feel a bit jumbled lol. Still, I hope they give a good sense of what I can do as a Software Engineer, Data Engineer, and/or Data Analyst.";

function ToolboxLinks({ cols = 1 }: { cols?: 1 | 2 }) {
  return (
    <div
      className={cols === 2 ? "grid grid-cols-2 gap-2" : "flex flex-col gap-2"}
    >
      {TOOLS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className="card flex items-center gap-3 px-4 py-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--accent)]"
        >
          <span className="text-base leading-none">{t.icon}</span>
          <span
            className="text-sm font-sans font-medium"
            style={{ color: "var(--secondary)" }}
          >
            {t.label}
          </span>
        </Link>
      ))}
    </div>
  );
}

function SectionHeading({ label, title }: { label: string; title: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-3">
      <p className="section-label mb-0">{label}</p>
      <h2 className="text-lg font-semibold sm:text-2xl sm:font-bold" style={{ color: "var(--primary)" }}>
        {title}
      </h2>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      {/* ── DESKTOP ─────────────────────────────────────────── */}
      <div
        className="hidden sm:flex flex-col max-w-6xl mx-auto px-6 py-6"
        style={{ height: "calc(100vh - 56px - 36px)" }}
      >
        <section className="flex flex-row gap-8 items-start animate-fade-in mb-6">
          <img
            src="/prof-pic.jpg"
            alt="Riko"
            className="w-48 h-48 rounded-2xl object-cover flex-shrink-0"
          />

          <div className="space-y-4 flex-1 min-w-0">
            <div>
              <p className="section-label">{"Hello, I'm"}</p>
              <h1
                className="text-4xl font-bold"
                style={{ color: "var(--primary)" }}
              >
                F. M. Pastoriko (Riko)
              </h1>
              <p className="mt-1 text-sm" style={{ color: "var(--secondary)" }}>
                Software Engineer · Data Engineer · Data Analyst
              </p>
            </div>
            <p
              className="leading-relaxed text-base"
              style={{ color: "var(--secondary)" }}
            >
              {BIO_TEXT}
            </p>
          </div>

          <div className="flex-shrink-0" style={{ width: 200 }}>
            <p className="section-label mb-3">Toolbox</p>
            <ToolboxLinks cols={1} />
          </div>
        </section>

        <section className="flex flex-col flex-1 min-h-0">
          <SectionHeading label="Experience" title="Career Highlights" />
          <div
            className="flex-1 min-h-0 overflow-y-auto rounded-xl border pr-1"
            style={{
              borderColor: "var(--border)",
              background: "var(--bg)",
              padding: "1rem",
            }}
          >
            <Timeline />
          </div>
        </section>
      </div>

      {/* ── MOBILE ──────────────────────────────────────────── */}
      <div
        className="sm:hidden flex flex-col max-w-6xl mx-auto px-4 py-4"
        style={{ height: "calc(100vh - 56px - 36px)" }}
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
          <ToolboxLinks cols={2} />
        </section>

        <section className="flex flex-col flex-1 min-h-0">
          <SectionHeading label="Experience" title="Career Highlights" />
          <div
            className="flex-1 min-h-0 overflow-y-auto rounded-xl border pr-1"
            style={{
              borderColor: "var(--border)",
              background: "var(--bg)",
              padding: "0.75rem",
            }}
          >
            <Timeline />
          </div>
        </section>
      </div>
    </>
  );
}
