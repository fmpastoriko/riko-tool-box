"use client";
import Link from "next/link";

interface ToolCardProps {
  href: string;
  title: string;
  description: string;
  demonstrates: string[];
  mediumUrl?: string;
}

export default function ToolCard({
  href,
  title,
  description,
  demonstrates,
  mediumUrl,
}: ToolCardProps) {
  return (
    <div
      className="card group flex flex-col gap-3 transition-all duration-200"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={href} className="flex-1 min-w-0">
          <h3
            className="font-semibold text-base group-hover:text-accent transition-colors"
            style={{ color: "var(--primary)" }}
          >
            {title}
          </h3>
        </Link>
        {mediumUrl ? (
          <a
            href={mediumUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Read my thinking on Medium"
            className="flex-shrink-0 text-xs px-2 py-0.5 rounded border transition-colors font-mono"
            style={{ color: "var(--muted)", borderColor: "var(--border)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.color = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--muted)";
            }}
          >
            Medium ↗
          </a>
        ) : (
          <span
            className="flex-shrink-0 text-xs px-2 py-0.5 rounded border font-mono"
            style={{
              color: "var(--border)",
              borderColor: "var(--border)",
              opacity: 0.5,
            }}
            title="Article coming soon"
          >
            Medium ↗
          </span>
        )}
      </div>
      <Link href={href} className="flex-1">
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--secondary)" }}
        >
          {description}
        </p>
      </Link>
      <div className="flex flex-wrap gap-1.5 pt-1">
        {demonstrates.map((d) => (
          <span key={d} className="tag">
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}
