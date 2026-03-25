import React from "react";

interface SectionLabelProps {
  children: React.ReactNode;
  noMargin?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function SectionLabel({
  children,
  noMargin = false,
  className = "",
  style,
}: SectionLabelProps) {
  return (
    <p
      className={`section-label ${noMargin ? "mb-0" : ""} ${className}`}
      style={style}
    >
      {children}
    </p>
  );
}
