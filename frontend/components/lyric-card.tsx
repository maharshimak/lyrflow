"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Info } from "lucide-react";

import type { LyricLine } from "@/lib/types";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { cn } from "./ui/cn";

const emotionStyles: Record<string, { badge: string; ring: string }> = {
  hype: { badge: "bg-pink-500/15 border-pink-400/30 text-pink-100", ring: "ring-pink-400/30" },
  sad: { badge: "bg-sky-500/15 border-sky-400/30 text-sky-100", ring: "ring-sky-400/30" },
  aggressive: {
    badge: "bg-red-500/15 border-red-400/30 text-red-100",
    ring: "ring-red-400/30",
  },
  soft: { badge: "bg-teal-500/15 border-teal-400/30 text-teal-100", ring: "ring-teal-400/30" },
  playful: { badge: "bg-yellow-500/15 border-yellow-400/30 text-yellow-100", ring: "ring-yellow-400/30" },
  longing: {
    badge: "bg-violet-500/15 border-violet-400/30 text-violet-100",
    ring: "ring-violet-400/30",
  },
  empowering: {
    badge: "bg-emerald-500/15 border-emerald-400/30 text-emerald-100",
    ring: "ring-emerald-400/30",
  },
  neutral: { badge: "bg-white/5 border-white/10 text-white/70", ring: "ring-white/10" },
};

export function LyricCard({
  lyric,
  expanded,
  onToggle,
  index,
  focused,
}: {
  lyric: LyricLine;
  expanded: boolean;
  onToggle: () => void;
  index: number;
  focused?: boolean;
}) {
  const emotion = String(lyric.emotion || "neutral");
  const style = emotionStyles[emotion] ?? emotionStyles.neutral;
  const diff = Math.max(0, Math.min(100, Number(lyric.difficulty_score ?? 0)));
  const priority = String(lyric.practice_priority || "medium");
  const priColor =
    priority === "high"
      ? "bg-white/5 border-white/20 text-white"
      : priority === "low"
        ? "bg-white/5 border-white/10 text-white/70"
        : "bg-white/5 border-teal-400/20 text-white/80";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, delay: Math.min(0.12, index * 0.02) }}
      className={cn(
        "glass rounded-2xl p-4 border border-white/10 soft-shadow cursor-pointer select-none",
        style.ring,
        focused ? "ring-2 ring-cyan-400/40 bg-white/5" : "",
        lyric.is_repeated && !focused ? "opacity-90" : ""
      )}
      whileHover={{ scale: 1.01 }}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onToggle();
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-white/50">Line #{lyric.index ?? index + 1}</div>
          <div
            className={cn(
              "mt-1 font-extrabold leading-snug break-words",
              focused ? "text-xl drop-shadow-[0_0_22px_rgba(34,211,238,0.22)]" : "text-lg"
            )}
          >
            {lyric.line}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <Badge className={cn("font-semibold text-[11px] rounded-xl", style.badge)}>
            {emotion.toUpperCase()}
          </Badge>
          <Badge className={cn("font-semibold text-[11px] rounded-xl", priColor)}>
            {priority.toUpperCase()}
          </Badge>
          {lyric.is_repeated ? (
            <Badge className="font-semibold text-[11px] rounded-xl bg-white/5 border-white/20 text-white/80">
              REPEAT
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <div className="text-sm text-white/60">Romanized</div>
        <div className="font-semibold text-teal-200 drop-shadow-[0_0_18px_rgba(34,211,238,0.25)] break-words">
          {lyric.romanized}
        </div>

        <div className="text-sm text-white/60">Translation</div>
        <div className="text-sm text-white/75 leading-relaxed break-words">
          {lyric.translation}
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between gap-2 text-xs text-white/60 mb-1">
          <span>Difficulty</span>
          <span className="text-white/80 font-semibold">{diff}/100</span>
        </div>
        <Progress value={diff} />
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-4"
          >
            <div className="grid gap-3">
              <div>
                <div className="text-xs text-white/60">Syllables</div>
                <div className="mt-1 font-mono text-sm text-white/85 tracking-wide">
                  {lyric.syllables || "—"}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-white/60">Phoneme hints</div>
                  <div className="mt-1 text-sm text-white/75">
                    {lyric.phoneme_hints ? (
                      <span>{lyric.phoneme_hints}</span>
                    ) : (
                      <span className="text-white/45">No hint provided.</span>
                    )}
                  </div>
                </div>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-center w-9 h-9 rounded-xl border border-white/10 bg-white/5">
                        <Info size={16} className="text-white/70" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {lyric.phoneme_hints ? (
                        <span>{lyric.phoneme_hints}</span>
                      ) : (
                        <span>Add your own hint later in Phase 2.</span>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

