import React from "react";

interface TagProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function Tag({ children, className = "", style }: TagProps) {
  return (
    <span className={`tag ${className}`} style={style}>
      {children}
    </span>
  );
}
