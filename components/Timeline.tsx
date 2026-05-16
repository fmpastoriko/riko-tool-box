"use client";

import { useState } from "react";
import { timelineData } from "@/data/timeline";
import TimelineCard from "./TimelineCard";

export default function Timeline() {
  const [openId, setOpenId] = useState<number | null>(null);
  const sorted = [...timelineData].sort((a, b) => b.id - a.id);

  return (
    <div className="space-y-3">
      {sorted.map((entry) => (
        <TimelineCard
          key={entry.id}
          entry={entry}
          open={openId === entry.id}
          onToggle={() => setOpenId(openId === entry.id ? null : entry.id)}
        />
      ))}
    </div>
  );
}
