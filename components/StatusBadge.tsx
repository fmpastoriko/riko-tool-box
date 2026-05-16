import React from "react";

type BadgeVariant = "accent" | "border" | "error" | "success" | "custom";

interface StatusBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  style?: React.CSSProperties;
}

const VARIANT_STYLES: Record<BadgeVariant, React.CSSProperties> = {
  accent: { background: "var(--accent-dim)", color: "var(--accent)" },
  border: { background: "var(--border)", color: "var(--secondary)" },
  error: { background: "rgba(239,68,68,0.1)", color: "rgb(239,68,68)" },
  success: { background: "rgba(34,197,94,0.1)", color: "rgb(34,197,94)" },
  custom: {},
};

export default function StatusBadge({
  children,
  variant = "border",
  className = "",
  style,
}: StatusBadgeProps) {
  return (
    <span
      className={`text-xs font-mono px-2 py-0.5 rounded ${className}`}
      style={{ ...VARIANT_STYLES[variant], ...style }}
    >
      {children}
    </span>
  );
}
