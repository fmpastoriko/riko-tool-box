"use client";

import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {}
      }}
      className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
      style={{ background: "rgba(0,0,0,0.1)", color: "inherit", opacity: 0.6 }}
    >
      {copied ? "✓ copied" : "⎘ copy"}
    </button>
  );
}
