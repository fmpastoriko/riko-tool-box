"use client";

interface ToolHeaderProps {
  title: string;
  subtitle: string;
  mediumUrl?: string;
}

export default function ToolHeader({
  title,
  subtitle,
  mediumUrl,
}: ToolHeaderProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold" style={{ color: "var(--primary)" }}>
        {title}
      </h1>
      <p className="text-xs mt-0.5" style={{ color: "var(--secondary)" }}>
        {subtitle}
        {mediumUrl && (
          <>
            {" "}
            <a
              href={mediumUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent)" }}
              className="underline"
            >
              Read why ↗
            </a>
          </>
        )}
      </p>
    </div>
  );
}
