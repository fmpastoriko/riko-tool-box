import React from "react";

interface ErrorTextProps {
  children: React.ReactNode;
  className?: string;
}

export default function ErrorText({
  children,
  className = "",
}: ErrorTextProps) {
  return (
    <p
      className={`text-xs font-mono ${className}`}
      style={{ color: "rgb(239,68,68)" }}
    >
      {children}
    </p>
  );
}
