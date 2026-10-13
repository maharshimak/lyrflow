"use client";

import * as React from "react";
import { cn } from "./cn";

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none transition hover:bg-white/10 focus:border-cyan-400/40",
        className
      )}
    >
      {children}
    </select>
  );
}

