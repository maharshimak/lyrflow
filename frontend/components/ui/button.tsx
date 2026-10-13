"use client";

import * as React from "react";
import { cn } from "./cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
};

export function Button({
  className,
  variant = "default",
  size = "md",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.99]";

  const variants: Record<string, string> = {
    default:
      "bg-gradient-to-r from-pink-500/90 via-purple-500/90 to-cyan-400/90 text-slate-900 shadow-glow soft-shadow",
    secondary:
      "bg-white/5 border border-white/10 text-slate-100 hover:bg-white/10",
    ghost: "bg-transparent text-slate-100 hover:bg-white/5 border border-white/10",
  };

  const sizes: Record<string, string> = {
    sm: "text-sm px-3 py-2 rounded-xl",
    md: "text-sm",
    lg: "text-base px-6 py-3.5",
  };

  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}

