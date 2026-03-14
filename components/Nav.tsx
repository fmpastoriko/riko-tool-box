"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const links = [
  { href: "/", label: "Home" },
  { href: "/tools", label: "Tools" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav
      className="sticky top-0 z-50 border-b"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="font-mono text-sm font-semibold"
          style={{ color: "var(--primary)" }}
        >
          riko.toolbox
        </Link>
        <div className="flex items-center gap-1 sm:gap-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm px-2 py-1 rounded transition-colors"
              style={{
                color: pathname === l.href ? "var(--accent)" : "var(--secondary)",
              }}
            >
              {l.label}
            </Link>
          ))}
          <a
            href="https://github.com/fmpastoriko"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm px-2 py-1 rounded transition-colors hidden sm:inline-flex"
            style={{ color: "var(--secondary)" }}
          >
            GitHub ↗
          </a>
          <a
            href="https://www.linkedin.com/in/fransiskus-pastoriko-617b10164/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm px-2 py-1 rounded transition-colors hidden sm:inline-flex"
            style={{ color: "var(--secondary)" }}
          >
            LinkedIn ↗
          </a>
          <a
            href="https://docs.google.com/document/d/18JjuVlVi75p8zrqZLmBKGH7UNUk9riT_/edit?usp=sharing&ouid=102797638099932464376&rtpof=true&sd=true"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost hidden sm:inline-flex"
          >
            TRD ↗
          </a>
          <a
            href="https://docs.google.com/document/d/1zUFSrcWuf5AFhZUU335PIU4--8l8qvP_pDg7YT0GzeU/edit?tab=t.0"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary hidden sm:inline-flex"
          >
            CV ↗
          </a>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
