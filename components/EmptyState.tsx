import React from "react";

interface EmptyStateProps {
  message?: string;
  children?: React.ReactNode;
  mono?: boolean;
  className?: string;
}

export default function EmptyState({
  message,
  children,
  mono = true,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex items-center justify-center h-full ${className}`}>
      {children ?? (
        <p
          className={mono ? "text-xs font-mono" : "text-sm"}
          style={{ color: "var(--muted)" }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
