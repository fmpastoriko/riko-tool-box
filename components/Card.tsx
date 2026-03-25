import React from "react";
import SectionLabel from "@/components/SectionLabel";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  title?: string;
  headerRight?: React.ReactNode;
}

export default function Card({
  children,
  className = "",
  style,
  onClick,
  title,
  headerRight,
}: CardProps) {
  return (
    <div
      className={`card space-y-2 ${className}`}
      style={style}
      onClick={onClick}
    >
      {title && (
        <div className="flex items-center justify-between flex-shrink-0 gap-1">
          <SectionLabel noMargin>{title}</SectionLabel>
          {headerRight && (
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {headerRight}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
