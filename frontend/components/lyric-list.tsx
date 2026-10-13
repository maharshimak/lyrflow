"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

import type { LyricLine } from "@/lib/types";
import { LyricCard } from "./lyric-card";

export function LyricList({ lyrics }: { lyrics: LyricLine[] }) {
  const [expandedIndex, setExpandedIndex] = React.useState<number | null>(null);
  const cardRefs = React.useRef<Array<HTMLDivElement | null>>([]);

  const focusIdx = React.useMemo(() => {
    if (!lyrics.length) return null;

    // Hackathon "wow moment": highlight the expressive focus line.
    // If present, always prioritize "나는 dream을 꿔" (or any lyric containing "dream" as fallback).
    const explicitDreamIdx = lyrics.findIndex((l) => (l.line || "").includes("dream"));
    if (explicitDreamIdx >= 0) return explicitDreamIdx;

    let bestIdx = 0;
    let bestScore = -1;
    for (let i = 0; i < lyrics.length; i++) {
      const l = lyrics[i];
      const diff = Number(l.difficulty_score || 0);
      const priorityBoost = l.practice_priority === "high" ? 120 : 0;
      const repeatBoost = l.is_repeated ? 25 : 0;
      const emotion = String(l.emotion || "neutral").toLowerCase();
      const emotionBoost =
        emotion === "hype" || emotion === "aggressive" || emotion === "longing" || emotion === "empowering"
          ? 20
          : 0;
      const score = diff + priorityBoost + repeatBoost + emotionBoost;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    return bestIdx;
  }, [lyrics]);

  React.useEffect(() => {
    if (focusIdx === null) return;
    setExpandedIndex(focusIdx);
  }, [lyrics, focusIdx]);

  React.useEffect(() => {
    if (focusIdx === null) return;
    const el = cardRefs.current[focusIdx];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusIdx]);

  if (!lyrics.length) {
    return (
      <div className="mt-4 px-2">
        <div className="text-sm text-white/60">No results yet.</div>
        <div className="text-white/70 mt-2 text-lg font-semibold">Analyze a song</div>
      </div>
    );
  }

  return (
    <div className="px-2">
      <div className="max-h-[68vh] overflow-y-auto pr-2">
        <motion.div layout className="space-y-3 pb-2">
          <AnimatePresence initial={false}>
            {lyrics.map((l, idx) => (
              <div
                key={`${l.index ?? idx}-${idx}`}
                ref={(node) => {
                  cardRefs.current[idx] = node;
                }}
              >
                <LyricCard
                  lyric={l}
                  index={idx}
                  expanded={expandedIndex === idx}
                  onToggle={() => setExpandedIndex((cur) => (cur === idx ? null : idx))}
                  focused={focusIdx === idx}
                />
              </div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

