import React from "react";

interface TagButtonProps {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function TagButton({
  children,
  active,
  onClick,
  disabled,
  className = "",
  style,
}: TagButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`tag cursor-pointer ${className}`}
      style={{
        background: active ? "var(--accent-dim)" : "var(--bg)",
        color: active ? "var(--accent)" : "var(--muted)",
        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
        padding: "4px 10px",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
