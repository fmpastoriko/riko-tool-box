import React from "react";

interface SectionLabelProps {
  children: React.ReactNode;
  noMargin?: boolean;
  className?: string;
}

export default function SectionLabel({
  children,
  noMargin = false,
  className = "",
}: SectionLabelProps) {
  return (
    <p className={`section-label ${noMargin ? "mb-0" : ""} ${className}`}>
      {children}
    </p>
  );
}
