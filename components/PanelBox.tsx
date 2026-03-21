"use client";

interface PanelBoxProps {
  title: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

export default function PanelBox({
  title,
  headerRight,
  children,
}: PanelBoxProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0 card gap-2">
      <div className="flex items-center justify-between flex-shrink-0 gap-1">
        <p className="section-label mb-0">{title}</p>
        {headerRight && (
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {headerRight}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
