"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LyricLine } from "@/lib/types";
import { motion } from "framer-motion";
import { LyricCard } from "./lyric-card";

declare global {
  interface Window {
    gsap?: any;
    ScrambleTextPlugin?: any;
  }
}

type MusicPortfolioConfig = {
  timeZone?: string;
  timeUpdateInterval?: number;
  idleDelay: number;
  debounceDelay?: number;
};

function TimeDisplay({ CONFIG }: { CONFIG: MusicPortfolioConfig }) {
  const [time, setTime] = useState({ hours: "", minutes: "", dayPeriod: "" });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: CONFIG.timeZone,
        hour12: true,
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
      };

      const formatter = new Intl.DateTimeFormat("en-US", options);
      const parts = formatter.formatToParts(now);

      setTime({
        hours: parts.find((p) => p.type === "hour")?.value || "",
        minutes: parts.find((p) => p.type === "minute")?.value || "",
        dayPeriod: parts.find((p) => p.type === "dayPeriod")?.value || "",
      });
    };

    updateTime();
    const interval = setInterval(updateTime, CONFIG.timeUpdateInterval ?? 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <time className="text-xs text-white/60 corner-item bottom-right" id="current-time">
      {time.hours}
      <span className="time-blink">:</span>
      {time.minutes} {time.dayPeriod}
    </time>
  );
}

const EMOTION_BG: Record<string, string> = {
  hype: "radial-gradient(circle at 18% 22%, rgba(239,68,68,0.32), rgba(0,0,0,0) 52%), radial-gradient(circle at 78% 38%, rgba(236,72,153,0.20), rgba(0,0,0,0) 55%)",
  aggressive:
    "radial-gradient(circle at 18% 22%, rgba(249,115,22,0.32), rgba(0,0,0,0) 52%), radial-gradient(circle at 78% 38%, rgba(239,68,68,0.18), rgba(0,0,0,0) 55%)",
  empowering:
    "radial-gradient(circle at 20% 24%, rgba(168,85,247,0.28), rgba(0,0,0,0) 52%), radial-gradient(circle at 80% 34%, rgba(34,211,238,0.16), rgba(0,0,0,0) 55%)",
  sad: "radial-gradient(circle at 20% 24%, rgba(56,189,248,0.28), rgba(0,0,0,0) 52%), radial-gradient(circle at 80% 34%, rgba(59,130,246,0.16), rgba(0,0,0,0) 55%)",
  soft: "radial-gradient(circle at 20% 24%, rgba(34,211,238,0.28), rgba(0,0,0,0) 52%), radial-gradient(circle at 82% 38%, rgba(168,85,247,0.14), rgba(0,0,0,0) 55%)",
  playful: "radial-gradient(circle at 20% 24%, rgba(236,72,153,0.22), rgba(0,0,0,0) 52%), radial-gradient(circle at 82% 38%, rgba(250,204,21,0.18), rgba(0,0,0,0) 55%)",
  longing:
    "radial-gradient(circle at 20% 24%, rgba(99,102,241,0.26), rgba(0,0,0,0) 52%), radial-gradient(circle at 82% 38%, rgba(56,189,248,0.14), rgba(0,0,0,0) 55%)",
  neutral: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.06), rgba(0,0,0,0) 60%)",
};

export default function MusicPortfolioImmersive({
  LYRICS_DATA = [],
  LOCATION = {},
  CONFIG = { idleDelay: 3500, debounceDelay: 100 },
  SOCIAL_LINKS = {},
  CALLBACKS = {},
  SONG_TITLE = "",
  SONG_ARTIST = "",
  TOTAL_LINES = 0,
  KO_LINES = 0,
  EN_LINES = 0,
  JA_LINES = 0,
  TRANSLATION_LANG = "en",
}: {
  LYRICS_DATA?: LyricLine[];
  LOCATION?: { latitude?: string; longitude?: string; display?: boolean };
  CONFIG?: MusicPortfolioConfig;
  SOCIAL_LINKS?: Record<string, string>;
  CALLBACKS?: {
    onProjectHover?: (project: LyricLine) => void;
    onProjectLeave?: () => void;
    onContainerLeave?: () => void;
    onIdleStart?: () => void;
  };
  SONG_TITLE?: string;
  SONG_ARTIST?: string;
  TOTAL_LINES?: number;
  KO_LINES?: number;
  EN_LINES?: number;
  JA_LINES?: number;
  TRANSLATION_LANG?: "en" | "fr" | string;
}) {
  const projects = useMemo(() => LYRICS_DATA ?? [], [LYRICS_DATA]);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const [activeIndex, setActiveIndex] = useState(-1);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [isIdle, setIsIdle] = useState(true);
  const [visibleCount, setVisibleCount] = useState(0);

  const idleTimerRef = useRef<any>(null);
  const idleTimelineRef = useRef<any>(null);
  const visibleCountRef = useRef(0);

  const spotifyUrl = SOCIAL_LINKS.spotify ?? "https://open.spotify.com";
  const emailUrl = SOCIAL_LINKS.email ?? "mailto:user-7760dd13@example.test";
  const linksUrl = SOCIAL_LINKS.links ?? "/demo";

  const hardestIndex = useMemo(() => {
    if (!projects.length) return -1;
    let best = 0;
    let bestDiff = -1;
    for (let i = 0; i < projects.length; i++) {
      const d = Number(projects[i]?.difficulty_score ?? 0);
      if (d > bestDiff) {
        bestDiff = d;
        best = i;
      }
    }
    return best;
  }, [projects]);

  const visibleLyrics = useMemo(() => projects.slice(0, visibleCount), [projects, visibleCount]);

  // Progressive reveal
  useEffect(() => {
    setVisibleCount(0);
    visibleCountRef.current = 0;
    setActiveIndex(-1);
    setExpandedIndex(null);

    if (!projects.length) return;

    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setVisibleCount(i);
      visibleCountRef.current = i;
      if (i >= projects.length) clearInterval(interval);
    }, 80);

    return () => clearInterval(interval);
  }, [projects]);

  const stopIdle = useCallback(() => {
    if (idleTimelineRef.current) {
      idleTimelineRef.current.kill();
      idleTimelineRef.current = null;
    }
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    setIsIdle(false);

    const nodes = rootRef.current?.querySelectorAll?.(".lyric-card-premium") ?? [];
    nodes.forEach?.((n: any) => {
      n && n.style && (n.style.opacity = "1");
    });
  }, []);

  const startIdle = useCallback(() => {
    const gsap = typeof window !== "undefined" ? window.gsap : undefined;
    if (!gsap || !rootRef.current) return;

    if (idleTimelineRef.current) return;

    setIsIdle(true);
    const cards = Array.from(rootRef.current.querySelectorAll(".lyric-card-premium")) as HTMLElement[];
    if (!cards.length) return;

    idleTimelineRef.current = gsap.timeline({ repeat: -1, repeatDelay: 1.5 });
    cards.forEach((card, idx) => {
      const hide = 0 + idx * 0.05;
      const show = projects.length * 0.05 * 0.55 + idx * 0.05;

      idleTimelineRef.current!.to(
        card,
        { opacity: 0.25, duration: 0.12, ease: "power2.inOut" },
        hide
      );
      idleTimelineRef.current!.to(
        card,
        { opacity: 1, duration: 0.12, ease: "power2.inOut" },
        show
      );
    });

    CALLBACKS?.onIdleStart?.();
  }, [CALLBACKS, projects.length]);

  // Idle timer (no interaction)
  useEffect(() => {
    if (!projects.length) return;

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (activeIndex === -1) startIdle();
    }, CONFIG.idleDelay ?? 3500);

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    };
  }, [activeIndex, CONFIG.idleDelay, projects.length, startIdle]);

  const handleHover = useCallback(
    (idx: number) => {
      if (activeIndex === idx) return;
      stopIdle();
      setActiveIndex(idx);

      const p = projects[idx];
      const emotion = String(p?.emotion ?? "neutral").toLowerCase();
      const bg = EMOTION_BG[emotion] ?? EMOTION_BG.neutral;

      if (overlayRef.current) {
        overlayRef.current.style.backgroundImage = bg;
        overlayRef.current.style.opacity = "1";
        overlayRef.current.style.transform = "scale(1.22)";
        overlayRef.current.style.transition = "opacity 0.25s ease, transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
      }

      CALLBACKS?.onProjectHover?.(projects[idx]);
    },
    [activeIndex, projects, stopIdle, CALLBACKS]
  );

  const handleLeave = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setActiveIndex(-1);
      if (overlayRef.current) {
        overlayRef.current.style.opacity = "0";
      }
      CALLBACKS?.onProjectLeave?.();
    }, CONFIG.debounceDelay ?? 100);
  }, [CONFIG.debounceDelay, CALLBACKS]);

  if (!projects.length) {
    return (
      <div ref={rootRef} className="portfolio-shell">
        <div className="empty-state">
          <div className="corner-square" style={{ width: "1rem", height: "1rem" }} />
          <div className="empty-state-title">Analyze a song</div>
          <div className="empty-state-sub">Add artist + title</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="portfolio-shell">
      <div
        ref={overlayRef}
        className="bg-crossfade"
        style={{ backgroundImage: EMOTION_BG.neutral, opacity: 0 }}
        aria-hidden="true"
      />

      {/* Corner UI */}
      <div className="absolute top-4 right-5 pointer-events-auto">
        <div className="flex gap-3 items-center text-xs text-white/60">
          <a href={spotifyUrl} target="_blank" rel="noopener" className="hover:text-white transition">
            Spotify
          </a>
          <a href={emailUrl} className="hover:text-white transition">
            Email
          </a>
          <a href={linksUrl} className="hover:text-white transition">
            Links
          </a>
        </div>
      </div>

      <div className="absolute bottom-4 left-5 text-white/40 text-xs pointer-events-none">
        {LOCATION?.display
          ? String(LOCATION.latitude ?? "") + " " + String(LOCATION.longitude ?? "")
          : "MAK AI • LIVE AI COACH"}
      </div>

      <div className="absolute bottom-3 right-5 pointer-events-none">
        <TimeDisplay CONFIG={CONFIG} />
      </div>

      <div className="p-6 sm:p-7 relative">
        {/* Single paragraph mode: one continuous coaching block, no “random boxes”. */}
        <motion.pre
          key={`paragraph-${visibleCount}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="paragraph-output"
        >
          {[
            "Mak Ai",
            "Hackathon Aivancity 2026",
            "♫",
            SONG_TITLE ? String(SONG_TITLE) : "—",
            SONG_ARTIST ? String(SONG_ARTIST) : "—",
            `${TOTAL_LINES || projects.length} lines`,
            `${KO_LINES} Korean`,
            `${EN_LINES} English`,
            "New search",
            "Romanization",
            TRANSLATION_LANG === "fr" ? "Traduction FR" : "Translation EN",
            ...visibleLyrics.map((p) => {
              const lineNo = Number(p.index ?? 0) + 1;
              const langTag = String(p.language ?? "en") || "en";
              const original = String(p.line ?? "").trim() || "—";
              const roman = String(p.romanized ?? "").trim() || "—";
              const trans = String(p.translation ?? "").trim() || "—";
              return [lineNo, langTag, original, roman, trans].join("\n");
            }),
          ].join("\n\n")}
        </motion.pre>
      </div>
    </div>
  );
}

