"use client";

import { useState } from "react";
import { useLightbox } from "@/lib/lightbox";

export default function ScreenshotSlot({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const [state, setState] = useState<"jpg" | "png" | "failed">("jpg");
  const { open } = useLightbox();
  const resolvedSrc = state === "jpg" ? `${src}.jpg` : `${src}.png`;

  if (state === "failed") {
    return (
      <div
        className="w-full rounded-lg flex flex-col items-center justify-center gap-1"
        style={{
          background: "var(--border)",
          border: "2px dashed var(--muted)",
          aspectRatio: "16/10",
        }}
      >
        <span style={{ fontSize: 18 }}>🖼️</span>
        <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
          no image
        </span>
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className="w-full rounded-lg object-cover object-top cursor-zoom-in transition-opacity hover:opacity-80"
      style={{ aspectRatio: "16/10" }}
      onError={() => setState((prev) => (prev === "jpg" ? "png" : "failed"))}
      onClick={() => open(resolvedSrc, alt)}
    />
  );
}
