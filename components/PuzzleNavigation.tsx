interface PuzzleNavigationProps {
  title: string;
  count: number;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onDownload: () => void;
  downloading?: boolean;
}

export default function PuzzleNavigation({
  title,
  count,
  currentIndex,
  onIndexChange,
  onDownload,
  downloading = false,
}: PuzzleNavigationProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {count > 1 && (
        <>
          <button
            onClick={() => onIndexChange(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="btn-ghost text-xs px-2 py-1"
            style={{ opacity: currentIndex === 0 ? 0.4 : 1 }}
          >
            ‹
          </button>
          <span className="text-xs font-mono px-1" style={{ color: "var(--muted)" }}>
            {currentIndex + 1} / {count}
          </span>
          <button
            onClick={() => onIndexChange(Math.min(count - 1, currentIndex + 1))}
            disabled={currentIndex === count - 1}
            className="btn-ghost text-xs px-2 py-1"
            style={{ opacity: currentIndex === count - 1 ? 0.4 : 1 }}
          >
            ›
          </button>
        </>
      )}
      <button
        onClick={onDownload}
        disabled={downloading || count === 0}
        className="btn-ghost text-xs"
        style={{
          color: "var(--accent)",
          opacity: count === 0 ? 0.4 : 1,
        }}
      >
        {downloading ? "..." : `Download PDF${count > 1 ? "s" : ""}`}
      </button>
    </div>
  );
}
