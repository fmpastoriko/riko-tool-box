"use client";
import Timeline from "@/components/Timeline";
import Link from "next/link";

const tools = [
  { href: "/tools/text-compare", icon: "⇄", label: "Text Compare" },
  { href: "/tools", icon: "⊞", label: "Open All Tools" },
];

export default function HomePage() {
  return (
    <div
      className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 flex flex-col"
      style={{ height: "calc(100vh - 56px)" }}
    >
      <section className="flex flex-col sm:flex-row gap-8 items-start animate-fade-in mb-10">
        <div className="flex-shrink-0">
          <img
            src="/prof-pic.jpg"
            alt="Riko"
            className="w-36 h-36 sm:w-48 sm:h-48 rounded-2xl object-cover"
          />
        </div>

        <div className="space-y-4 flex-1 min-w-0">
          <div>
            <p className="section-label">{"Hello, I'm"}</p>
            <h1
              className="text-3xl sm:text-4xl font-bold"
              style={{ color: "var(--primary)" }}
            >
              {"F. M. Pastoriko (Riko)"}
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--secondary)" }}>
              {"Software Engineer · Data Engineer · Data Analyst"}
            </p>
          </div>
          <p
            className="leading-relaxed text-sm sm:text-base"
            style={{ color: "var(--secondary)" }}
          >
            {"Welcome! This site is meant as a showcase for my work and my capability, while also as my personal tool-box. Most of these tools were originally built for my own use, so things might feel a bit jumbled lol. Still, I hope they give a good sense of what I can do as a Software Engineer, Data Engineer, and/or Data Analyst."}
          </p>
        </div>

        <div className="flex-shrink-0" style={{ width: 200 }}>
          <p className="section-label mb-3">{"Toolbox"}</p>
          <div className="flex flex-col gap-2">
            {tools.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="card flex items-center gap-3 px-4 py-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--accent)]"
              >
                <span className="text-base leading-none">{t.icon}</span>
                <span className="text-xs font-mono" style={{ color: "var(--secondary)" }}>
                  {t.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-col flex-1 min-h-0">
        <div className="flex items-baseline gap-3 mb-4">
          <p className="section-label mb-0">{"Experience"}</p>
          <h2 className="text-2xl font-bold" style={{ color: "var(--primary)" }}>
            {"Career Highlights"}
          </h2>
        </div>
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

      <footer
        className="mt-6 flex items-center justify-between text-xs font-mono flex-wrap gap-2"
        style={{ color: "var(--muted)" }}
      >
        <span>riko.toolbox</span>
        <span>{"made with Next.js · Tailwind · Neon · Vercel"}</span>
      </footer>
    </div>
  );
}
