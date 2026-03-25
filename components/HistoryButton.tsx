"use client";
import Link from "next/link";

interface HistoryButtonProps {
  href: string;
}

export default function HistoryButton({ href }: HistoryButtonProps) {
  return (
    <Link href={href} className="btn-ghost text-xs py-1 px-3 flex-shrink-0">
      History ↗
    </Link>
  );
}
