"use client";

import * as React from "react";
import { cn } from "./cn";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none transition hover:bg-white/10 focus:border-cyan-400/40",
        props.className
      )}
    />
  );
}

