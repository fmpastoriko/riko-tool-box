"use client";

import React from "react";
import Card from "@/components/Card";

interface PanelBoxProps {
  title: string;
  className?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

export default function PanelBox({
  title,
  headerRight,
  className,
  children,
}: PanelBoxProps) {
  const combinedClassName = className
    ? `flex-1 flex flex-col min-h-0 ${className}`
    : "flex-1 flex flex-col min-h-0";

  return (
    <Card
      title={title}
      headerRight={headerRight}
      className={combinedClassName}
    >
      {children}
    </Card>
  );
}
