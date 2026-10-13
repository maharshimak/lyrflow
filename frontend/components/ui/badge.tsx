"use client";

import * as React from "react";
import { cn } from "./cn";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "soft" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xl px-3 py-1 text-xs border border-white/10 bg-white/5",
        className
      )}
      {...props}
    />
  );
}

