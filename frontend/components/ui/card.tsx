"use client";

import * as React from "react";
import { cn } from "./cn";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass soft-shadow rounded-3xl overflow-hidden", className)} {...props} />;
}

