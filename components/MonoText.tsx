import React from "react";

type MonoTextColor = "muted" | "secondary" | "primary" | "accent";

interface MonoTextProps {
  children: React.ReactNode;
  color?: MonoTextColor;
  size?: "xs" | "sm";
  className?: string;
  style?: React.CSSProperties;
}

const COLOR_MAP: Record<MonoTextColor, string> = {
  muted: "var(--muted)",
  secondary: "var(--secondary)",
  primary: "var(--primary)",
  accent: "var(--accent)",
};

export default function MonoText({
  children,
  color = "secondary",
  size = "xs",
  className = "",
  style,
}: MonoTextProps) {
  return (
    <p
      className={`font-mono text-${size} ${className}`}
      style={{ color: COLOR_MAP[color], ...style }}
    >
      {children}
    </p>
  );
}
