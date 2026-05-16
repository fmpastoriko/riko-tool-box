"use client";

interface ToolHeaderProps {
  title: string;
  subtitle: string;
  mediumUrl?: string;
  hideSubtitleOnMobile?: boolean;
}

export default function ToolHeader({
  title,
  subtitle,
  mediumUrl,
  hideSubtitleOnMobile = true,
}: ToolHeaderProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold" style={{ color: "var(--primary)" }}>
        {title}
      </h1>
      <p
        className={`text-xs mt-0.5 ${hideSubtitleOnMobile ? "hidden sm:block" : ""}`}
        style={{ color: "var(--secondary)" }}
      >
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
