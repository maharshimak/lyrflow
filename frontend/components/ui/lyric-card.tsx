"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

import type { LyricLine } from "@/lib/types";
import { Badge } from "./badge";
import { cn } from "./cn";

// GSAP is loaded via CDN in app/layout.tsx
declare global {
  interface Window {
    gsap?: any;
    ScrambleTextPlugin?: any;
  }
}

const emotionToTheme: Record<
  string,
  { badge: string; ring: string; glow: string; accent: string; text: string }
> = {
  hype: {
    badge: "bg-red-500/15 border-red-400/30 text-red-100",
    ring: "ring-red-400/30",
    glow: "0 0 22px rgba(239,68,68,0.35)",
    accent: "rgba(239,68,68,0.35)",
    text: "text-red-100",
  },
  aggressive: {
    badge: "bg-orange-500/15 border-orange-400/30 text-orange-100",
    ring: "ring-orange-400/30",
    glow: "0 0 22px rgba(249,115,22,0.33)",
    accent: "rgba(249,115,22,0.33)",
    text: "text-orange-100",
  },
  empowering: {
    badge: "bg-purple-500/15 border-purple-400/30 text-purple-100",
    ring: "ring-purple-400/30",
    glow: "0 0 22px rgba(168,85,247,0.33)",
    accent: "rgba(168,85,247,0.33)",
    text: "text-purple-100",
  },
  sad: {
    badge: "bg-sky-500/15 border-sky-400/30 text-sky-100",
    ring: "ring-sky-400/30",
    glow: "0 0 22px rgba(56,189,248,0.33)",
    accent: "rgba(56,189,248,0.33)",
    text: "text-sky-100",
  },
  soft: {
    badge: "bg-cyan-500/15 border-cyan-400/30 text-cyan-100",
    ring: "ring-cyan-400/30",
    glow: "0 0 22px rgba(34,211,238,0.33)",
    accent: "rgba(34,211,238,0.33)",
    text: "text-cyan-100",
  },
  longing: {
    badge: "bg-indigo-500/15 border-indigo-400/30 text-indigo-100",
    ring: "ring-indigo-400/30",
    glow: "0 0 22px rgba(99,102,241,0.30)",
    accent: "rgba(99,102,241,0.30)",
    text: "text-indigo-100",
  },
  playful: {
    badge: "bg-pink-500/15 border-pink-400/30 text-pink-100",
    ring: "ring-pink-400/30",
    glow: "0 0 22px rgba(236,72,153,0.33)",
    accent: "rgba(236,72,153,0.33)",
    text: "text-pink-100",
  },
  neutral: {
    badge: "bg-white/5 border-white/10 text-white/70",
    ring: "ring-white/10",
    glow: "0 0 18px rgba(255,255,255,0.08)",
    accent: "rgba(255,255,255,0.08)",
    text: "text-white/70",
  },
};

function formatDifficulty(v: number) {
  return `${Math.round(Math.max(0, Math.min(100, v)))} /100`;
}

export function LyricCard({
  lyric,
  index,
  focused,
  expanded,
  onToggle,
  onCardHoverActive,
  isHardest,
}: {
  lyric: LyricLine;
  index: number;
  focused: boolean;
  expanded: boolean;
  onToggle: () => void;
  onCardHoverActive: boolean;
  isHardest: boolean;
}) {
  const emotion = String(lyric.emotion || "neutral").toLowerCase();
  const theme = emotionToTheme[emotion] ?? emotionToTheme.neutral;
  const diff = Math.max(0, Math.min(100, Number(lyric.difficulty_score ?? 0)));
  const priority = String(lyric.practice_priority || "medium").toLowerCase();

  const confidence = String(lyric.confidence || "low").toLowerCase();
  const emphasize = isHardest || diff > 75 || priority === "high";
  const showRepeatBadge = Boolean(lyric.is_repeated) && (focused || expanded || emphasize);

  const emotionEmoji =
    emotion === "hype"
      ? "🔥"
      : emotion === "aggressive"
        ? "😤"
        : emotion === "empowering"
          ? "💪"
          : emotion === "sad"
            ? "💔"
            : emotion === "soft"
              ? "✨"
              : emotion === "longing"
                ? "🌙"
              : emotion === "playful"
                ? "🎶"
                : "";

  const gsap = typeof window !== "undefined" ? window.gsap : undefined;
  const ScrambleTextPlugin = typeof window !== "undefined" ? window.ScrambleTextPlugin : undefined;

  const textRefs = {
    original: React.useRef<HTMLDivElement | null>(null),
    romanized: React.useRef<HTMLDivElement | null>(null),
    translation: React.useRef<HTMLDivElement | null>(null),
    emotion_label: React.useRef<HTMLSpanElement | null>(null),
    meta: React.useRef<HTMLDivElement | null>(null),
  };

  React.useEffect(() => {
    if (!gsap || !ScrambleTextPlugin) return;
    gsap.registerPlugin(ScrambleTextPlugin);
  }, [gsap, ScrambleTextPlugin]);

  React.useEffect(() => {
    if (!gsap || !ScrambleTextPlugin) return;

    const displayText = (k: keyof typeof textRefs) => {
      if (k === "meta") {
        return `${emotion.toUpperCase()} ${Math.round(diff)}/100 ${priority.toUpperCase()}`;
      }
      if (k === "emotion_label") {
        return `${emotionEmoji} ${emotion.toUpperCase()}`;
      }
      if (k === "original") return String(lyric.line ?? "");
      if (k === "romanized") return String(lyric.romanized ?? "");
      if (k === "translation") return String(lyric.translation ?? "");
      return "";
    };

    // Hover behavior: scramble while the card is actively hovered.
    const shouldScramble = onCardHoverActive;

    (Object.keys(textRefs) as Array<keyof typeof textRefs>).forEach((k) => {
      const ref = textRefs[k].current;
      if (!ref) return;

      gsap.killTweensOf(ref);

      if (shouldScramble) {
        gsap.to(ref, {
          duration: 0.55,
          scrambleText: {
            text: displayText(k),
            chars: "qwerty1337h@ck3r",
            revealDelay: 0.25,
            speed: 0.55,
          },
        });
      } else {
        // Reset real text so the card stays accurate.
        (ref as any).textContent = displayText(k);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCardHoverActive, focused, lyric, diff, emotion, priority]);

  return (
    <div
      className={cn(
        "lyric-card lyric-card-premium",
        "bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-5",
        "transition-all duration-300 hover:scale-[1.02]",
        focused ? theme.ring : "",
        emphasize ? "soft-shadow" : "",
        emphasize && emotion !== "neutral" ? "relative" : "",
        focused ? "z-10" : "",
        "cursor-pointer select-none",
        isHardest ? "hardest" : ""
      )}
      style={{
        boxShadow: focused ? theme.glow : undefined,
        borderColor: emphasize ? theme.accent : undefined,
      }}
      onClick={() => onToggle()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onToggle();
      }}
      data-confidence={confidence}
    >
      <div className="original">
        <div ref={textRefs.original} className="lyric-line text-lg font-bold leading-snug text-white/95">
          {lyric.line}
        </div>
      </div>

      <div className="mt-2 romanized">
        <div ref={textRefs.romanized} className="text-sm text-gray-300 break-words">
          {lyric.romanized}
        </div>
      </div>

      <div className="mt-2 translation">
        <div ref={textRefs.translation} className="text-sm italic text-gray-400 break-words leading-relaxed">
          {lyric.translation}
        </div>
      </div>

      <div className="meta mt-4 flex flex-wrap gap-2 items-center">
        <span
          ref={textRefs.emotion_label}
          className={cn("inline-flex items-center rounded-xl px-3 py-1 text-xs font-semibold", theme.badge)}
        >
          {emotionEmoji} {emotion.toUpperCase()}
        </span>
        <Badge
          className={cn(
            "font-semibold text-[11px] rounded-xl",
            priority === "high" ? "bg-white/5 border-white/20 text-white" : "bg-white/5 border-white/10 text-white/70"
          )}
        >
          {Math.round(diff)}/100
        </Badge>
        <Badge className={cn("font-semibold text-[11px] rounded-xl bg-white/5 border-white/10 text-white/75")}>
          {priority.toUpperCase()}
        </Badge>

        {showRepeatBadge ? (
          <Badge className="repeat-badge font-semibold text-[11px] rounded-xl bg-white/5 border-white/20 text-white/80">
            REPEAT
          </Badge>
        ) : null}
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-3"
          >
            <div ref={textRefs.meta} className="sr-only">
              {theme.text}
            </div>

            <div className="mt-3 grid gap-3">
              <div className="flex flex-col gap-1">
                <div className="text-xs text-white/60">Syllables</div>
                <div className="font-mono text-sm text-white/85 tracking-wide">
                  {lyric.syllables || "—"}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-xs text-white/60">Phoneme hints</div>
                <div className="text-sm text-white/75 break-words">
                  {lyric.phoneme_hints ? lyric.phoneme_hints : <span className="text-white/45">No hint provided.</span>}
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

