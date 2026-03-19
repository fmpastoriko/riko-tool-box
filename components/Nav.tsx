"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import AuthButton from "./AuthButton";

const internalLinks = [
  { href: "/", label: "Home" },
  { href: "/tools", label: "Tools" },
];

const externalLinks = [
  {
    href: "https://github.com/fmpastoriko",
    label: "GitHub ↗",
    mobileHidden: true,
  },
  {
    href: "https://www.linkedin.com/in/fransiskus-pastoriko-617b10164/",
    label: "LinkedIn ↗",
  },
  {
    href: "https://docs.google.com/document/d/18JjuVlVi75p8zrqZLmBKGH7UNUk9riT_/edit?usp=sharing&ouid=102797638099932464376&rtpof=true&sd=true",
    label: "TRD ↗",
    variant: "ghost" as const,
    mobileHidden: true,
  },
  {
    href: "https://docs.google.com/document/d/1zUFSrcWuf5AFhZUU335PIU4--8l8qvP_pDg7YT0GzeU/edit?tab=t.0",
    label: "CV ↗",
    variant: "primary" as const,
  },
];

const shared =
  "inline-flex items-center font-sans font-medium text-sm leading-none rounded-lg transition-all duration-150 whitespace-nowrap";

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav
      className="sticky top-0 z-50 border-b"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="w-full px-4 sm:px-6 h-14 flex items-center gap-2">
        <Link
          href="/"
          className="font-mono text-sm font-semibold hidden sm:block flex-shrink-0 mr-2"
          style={{ color: "var(--primary)" }}
        >
          riko.toolbox
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-0.5 sm:gap-1">
          {internalLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={shared + " px-2 py-1.5"}
              style={{
                color:
                  pathname === l.href ? "var(--accent)" : "var(--secondary)",
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-0.5 sm:gap-1">
          {externalLinks.map((l) => {
            const vis = l.mobileHidden
              ? "hidden sm:inline-flex"
              : "inline-flex";
            const pad = l.variant ? "px-3 py-1.5" : "px-2 py-1.5";
            const color =
              l.variant === "primary"
                ? { background: "var(--accent)", color: "#fff" }
                : l.variant === "ghost"
                  ? {
                      border: "1px solid var(--border)",
                      color: "var(--secondary)",
                    }
                  : { color: "var(--secondary)" };
            return (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`${vis} ${shared} ${pad}`}
                style={color}
              >
                {l.label}
              </a>
            );
          })}
        </div>
        <AuthButton />
        <ThemeToggle />
      </div>
    </nav>
  );
}
