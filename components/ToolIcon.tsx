import React from "react";
import type { ToolIconName } from "@/config/tools";

export function ToolIcon({
  type,
  size = 22,
}: {
  type: ToolIconName | "alltools";
  size?: number;
}) {
  if (type === "chatbot")
    return (
      <svg width={size} height={size} viewBox="0 0 26 26" fill="none">
        <rect
          x="2"
          y="3"
          width="22"
          height="14"
          rx="4"
          fill="currentColor"
          opacity="0.9"
        />
        <circle cx="8.5" cy="10" r="1.6" fill="white" />
        <circle cx="13" cy="10" r="1.6" fill="white" />
        <circle cx="17.5" cy="10" r="1.6" fill="white" />
        <path
          d="M9.5 17l2 3.5L13 18l1.5 2.5 2-3.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
      </svg>
    );
  if (type === "codebriefer")
    return (
      <svg width={size} height={size} viewBox="0 0 26 26" fill="none">
        <rect
          x="2"
          y="2"
          width="22"
          height="22"
          rx="4"
          fill="currentColor"
          opacity="0.9"
        />
        <path
          d="M8.5 9.5L6 12 8.5 14.5"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M17.5 9.5L20 12 17.5 14.5"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15 7l-4 12"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  if (type === "textcompare")
    return (
      <svg width={size} height={size} viewBox="0 0 26 26" fill="none">
        <rect
          x="2"
          y="2"
          width="10"
          height="22"
          rx="3"
          fill="currentColor"
          opacity="0.9"
        />
        <rect
          x="14"
          y="2"
          width="10"
          height="22"
          rx="3"
          fill="currentColor"
          opacity="0.4"
        />
        <path
          d="M5.5 8h5M5.5 11.5h3.5M5.5 15h5M5.5 18.5h2.5"
          stroke="white"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="M17 8h4M17 11.5h2.5M17 15h4M17 18.5h3"
          stroke="white"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.7"
        />
      </svg>
    );
  if (type === "codeapplier")
    return (
      <svg width={size} height={size} viewBox="0 0 26 26" fill="none">
        <rect
          x="2"
          y="2"
          width="22"
          height="22"
          rx="4"
          fill="currentColor"
          opacity="0.9"
        />
        <path
          d="M13 7v8M13 15l-3-3M13 15l3-3"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7 18h12"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  if (type === "arithmeticpuzzle")
    return (
      <svg width={size} height={size} viewBox="0 0 26 26" fill="none">
        <rect
          x="2"
          y="2"
          width="22"
          height="22"
          rx="4"
          fill="currentColor"
          opacity="0.9"
        />
        <rect
          x="5"
          y="5"
          width="6"
          height="6"
          rx="1"
          fill="white"
          opacity="0.9"
        />
        <rect
          x="10"
          y="10"
          width="6"
          height="6"
          rx="1"
          fill="white"
          opacity="0.9"
        />
        <rect
          x="15"
          y="15"
          width="6"
          height="6"
          rx="1"
          fill="white"
          opacity="0.9"
        />
        <path
          d="M7 8h2M8 7v2"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M12 12.5h2"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M17 18h2M18 17v2"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    );
  if (type === "wordsearch")
    return (
      <svg width={size} height={size} viewBox="0 0 26 26" fill="none">
        <rect
          x="2"
          y="2"
          width="22"
          height="22"
          rx="4"
          fill="currentColor"
          opacity="0.9"
        />
        <text
          x="5"
          y="10"
          fontSize="4.5"
          fill="white"
          opacity="0.5"
          fontFamily="monospace"
        >
          W Q R
        </text>
        <text
          x="5"
          y="15"
          fontSize="4.5"
          fill="white"
          opacity="0.5"
          fontFamily="monospace"
        >
          O X D
        </text>
        <text
          x="5"
          y="20"
          fontSize="4.5"
          fill="white"
          opacity="0.5"
          fontFamily="monospace"
        >
          R P S
        </text>
        <rect
          x="4.5"
          y="6"
          width="8"
          height="4.5"
          rx="1.5"
          fill="white"
          opacity="0.25"
        />
      </svg>
    );
  if (type === "alltools")
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        <rect
          x="1"
          y="1"
          width="7.5"
          height="7.5"
          rx="2.5"
          fill="currentColor"
          opacity="0.9"
        />
        <rect
          x="11.5"
          y="1"
          width="7.5"
          height="7.5"
          rx="2.5"
          fill="currentColor"
          opacity="0.9"
        />
        <rect
          x="1"
          y="11.5"
          width="7.5"
          height="7.5"
          rx="2.5"
          fill="currentColor"
          opacity="0.9"
        />
        <rect
          x="11.5"
          y="11.5"
          width="7.5"
          height="7.5"
          rx="2.5"
          fill="currentColor"
          opacity="0.9"
        />
      </svg>
    );
  // comingsoon fallback
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none">
      <rect
        x="2"
        y="2"
        width="22"
        height="22"
        rx="4"
        fill="currentColor"
        opacity="0.12"
      />
      <circle cx="13" cy="13" r="2" fill="currentColor" opacity="0.2" />
      <circle cx="7.5" cy="13" r="1.5" fill="currentColor" opacity="0.15" />
      <circle cx="18.5" cy="13" r="1.5" fill="currentColor" opacity="0.15" />
    </svg>
  );
}
