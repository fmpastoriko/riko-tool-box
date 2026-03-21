"use client";

export default function EmptyState({ text }: { text: string }) {
  return (
    <div
      className="flex-1 rounded-xl flex items-center justify-center text-sm"
      style={{ border: "1px dashed var(--border)", color: "var(--muted)" }}
    >
      {text}
    </div>
  );
}
