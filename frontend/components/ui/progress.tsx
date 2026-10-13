"use client";

import * as React from "react";
import { cn } from "./cn";

export function Progress({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-2 rounded-full bg-white/10 overflow-hidden", className)}>
      <div
        className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

