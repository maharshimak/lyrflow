"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { LyricLine } from "@/lib/types";

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

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const EMOTION_GRADIENT: Record<string, string> = {
  hype:        "radial-gradient(ellipse at 30% 30%, rgba(236,72,153,0.35), transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(239,68,68,0.2), transparent 60%)",
  aggressive:  "radial-gradient(ellipse at 25% 25%, rgba(239,68,68,0.4), transparent 60%), radial-gradient(ellipse at 75% 75%, rgba(249,115,22,0.2), transparent 60%)",
  empowering:  "radial-gradient(ellipse at 30% 30%, rgba(52,211,153,0.35), transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(168,85,247,0.2), transparent 60%)",
  sad:         "radial-gradient(ellipse at 30% 30%, rgba(56,189,248,0.32), transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(59,130,246,0.2), transparent 60%)",
  soft:        "radial-gradient(ellipse at 30% 30%, rgba(168,85,247,0.32), transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(129,140,248,0.2), transparent 60%)",
  playful:     "radial-gradient(ellipse at 30% 30%, rgba(250,204,21,0.3),  transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(236,72,153,0.15), transparent 60%)",
  longing:     "radial-gradient(ellipse at 30% 30%, rgba(129,140,248,0.32),transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(56,189,248,0.18), transparent 60%)",
  neutral:     "radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.06), transparent 60%)",
};

function TimeDisplay({ CONFIG }: { CONFIG: MusicPortfolioConfig }) {
  const [t, setT] = useState({ h: "", m: "", p: "" });
  useEffect(() => {
    const tick = () => {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: CONFIG.timeZone,
        hour12: true,
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
      }).formatToParts(new Date());
      setT({
        h: parts.find(p => p.type === "hour")?.value ?? "",
        m: parts.find(p => p.type === "minute")?.value ?? "",
        p: parts.find(p => p.type === "dayPeriod")?.value ?? "",
      });
    };
    tick();
    const id = setInterval(tick, CONFIG.timeUpdateInterval ?? 1000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line

  return (
    <time className="corner-item bottom-right" id="current-time">
      {t.h}<span className="time-blink">:</span>{t.m} {t.p}
    </time>
  );
}

/* ── Expanded inline detail ──────────────────────────────────────────────── */
function ExpandedRow({ lyric }: { lyric: LyricLine }) {
  const diff = Math.max(0, Math.min(100, Number(lyric.difficulty_score ?? 0)));
  const arc = String((lyric as any).vocal_arc || "—");
  const coach = String((lyric as any).breath_coach || "—");
  const syl = String(lyric.syllables || "—");
  const hints = String(lyric.phoneme_hints || "—");

  return (
    <div className="lyric-expanded">
      <div className="exp-section">
        <div className="exp-label">Syllables</div>
        <div className="exp-value">{syl}</div>
        <div className="exp-label" style={{ marginTop: "0.75rem" }}>Phoneme Hints</div>
        <div className="exp-value normal-case">{hints}</div>
      </div>
      <div className="exp-section">
        <div className="exp-label">Vocal Arc</div>
        <div className="exp-value">
          <span className="vocal-arc-tag">{arc}</span>
        </div>
        <div className="exp-label" style={{ marginTop: "0.75rem" }}>Breath Coach</div>
        <div className="exp-value normal-case">{coach}</div>
      </div>
      <div className="exp-section">
        <div className="exp-label">Difficulty — {diff}/100</div>
        <div className="diff-bar-outer">
          <div className="diff-bar-inner" style={{ width: `${diff}%` }} />
        </div>
        <div className="exp-label" style={{ marginTop: "0.75rem" }}>Practice</div>
        <div
          className={`exp-value priority-${lyric.practice_priority ?? "medium"}`}
          style={{ color: undefined }}
        >
          {String(lyric.practice_priority ?? "medium").toUpperCase()}
        </div>
        {lyric.is_repeated && (
          <>
            <div className="exp-label" style={{ marginTop: "0.5rem" }}>Note</div>
            <div className="exp-value" style={{ color: "rgba(255,255,255,0.35)" }}>Repeated line</div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Single lyric row ────────────────────────────────────────────────────── */
function LyricRow({
  lyric,
  index,
  isActive,
  isIdle,
  isFocused,
  isDimmed,
  onEnter,
  onLeave,
  onClick,
  expanded,
  setRef,
}: {
  lyric: LyricLine;
  index: number;
  isActive: boolean;
  isIdle: boolean;
  isFocused: boolean;
  isDimmed: boolean;
  onEnter: (i: number) => void;
  onLeave: () => void;
  onClick: (i: number) => void;
  expanded: boolean;
  setRef: (el: HTMLDivElement | null) => void;
}) {
  const emotion = String(lyric.emotion ?? "neutral").toLowerCase();
  const diff = Math.max(0, Math.min(100, Number(lyric.difficulty_score ?? 0)));

  /* GSAP scramble refs */
  const lineRef  = useRef<HTMLSpanElement>(null);
  const romRef   = useRef<HTMLSpanElement>(null);
  const transRef = useRef<HTMLSpanElement>(null);
  const emRef    = useRef<HTMLSpanElement>(null);
  const diffRef  = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const gsap = typeof window !== "undefined" ? window.gsap : null;
    const STP  = typeof window !== "undefined" ? window.ScrambleTextPlugin : null;
    if (!gsap) return;
    if (STP) { try { gsap.registerPlugin(STP); } catch {} }

    const pairs: [React.RefObject<HTMLSpanElement | null>, string][] = [
      [lineRef,  String(lyric.line        ?? "")],
      [romRef,   String(lyric.romanized   ?? "")],
      [transRef, String(lyric.translation ?? "")],
      [emRef,    String(lyric.emotion     ?? "neutral").toUpperCase()],
      [diffRef,  `${diff}/100`],
    ];

    if (isActive && STP) {
      pairs.forEach(([ref, text]) => {
        if (!ref.current) return;
        gsap.killTweensOf(ref.current);
        gsap.to(ref.current, {
          duration: 0.8,
          scrambleText: { text, chars: "qwerty1337h@ck3r", revealDelay: 0.25, speed: 0.5 },
        });
      });
    } else {
      pairs.forEach(([ref, text]) => {
        if (!ref.current) return;
        gsap.killTweensOf(ref.current);
        ref.current.textContent = text;
      });
    }
  }, [isActive, lyric]); // eslint-disable-line

  return (
    <>
      <div
        ref={setRef}
        className={[
          "project-item",
          isActive  ? "active"      : "",
          isFocused ? "focused-row" : "",
          isDimmed  ? "dimmed"      : "",
          isIdle    ? "idle"        : "",
        ].join(" ")}
        onMouseEnter={() => onEnter(index)}
        onMouseLeave={onLeave}
        onClick={() => onClick(index)}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onClick(index); }}
      >
        {/* # */}
        <span className="project-data idx-num">{(lyric.index ?? index) + 1}</span>

        {/* LINE */}
        <span ref={lineRef} className="project-data line-text">
          {lyric.line}
        </span>

        {/* ROMANIZED */}
        <span ref={romRef} className="project-data romanized-text">
          {lyric.romanized}
        </span>

        {/* TRANSLATION */}
        <span ref={transRef} className="project-data" style={{ fontSize: "0.65rem", textTransform: "none", color: "rgba(255,255,255,0.45)" }}>
          {lyric.translation}
        </span>

        {/* EMOTION */}
        <span ref={emRef} className={`emotion-pill emotion-${emotion}`} style={{ justifySelf: "start" }}>
          {emotion.toUpperCase()}
        </span>

        {/* DIFF */}
        <span ref={diffRef} className="project-data" style={{ textAlign: "right", fontSize: "0.65rem", fontWeight: 700, color: diff >= 70 ? "var(--color-accent)" : "rgba(255,255,255,0.5)" }}>
          {diff}/100
        </span>
      </div>

      {/* Expanded detail row */}
      {expanded && <ExpandedRow lyric={lyric} />}
    </>
  );
}

/* ── Main Component ──────────────────────────────────────────────────────── */
export default function MusicPortfolio({
  LYRICS_DATA = [],
  LOCATION = {},
  CALLBACKS = {},
  CONFIG = { idleDelay: 3500 },
  SOCIAL_LINKS = {},
}: {
  LYRICS_DATA?: LyricLine[];
  LOCATION?: { latitude?: string; longitude?: string; display?: boolean };
  CALLBACKS?: Record<string, (...args: any[]) => void>;
  CONFIG?: MusicPortfolioConfig;
  SOCIAL_LINKS?: Record<string, string>;
}) {
  const [activeIndex,   setActiveIndex]   = useState(-1);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [isIdle,        setIsIdle]        = useState(true);
  const [filter,        setFilter]        = useState<"all" | "hard" | "repeated" | "high">("all");
  const [visibleCount,  setVisibleCount]  = useState(0);

  const bgOverlayRef      = useRef<HTMLDivElement>(null);
  const containerRef      = useRef<HTMLDivElement>(null);
  const idleTimerRef      = useRef<any>(null);
  const idleAnimationRef  = useRef<any>(null);
  const debounceRef       = useRef<any>(null);
  const rowRefs           = useRef<Array<HTMLDivElement | null>>([]);
  const prevVisibleRef    = useRef(0);

  const projects = useMemo(() => LYRICS_DATA ?? [], [LYRICS_DATA]);

  /* Song-level stats from data */
  const songData = LYRICS_DATA as any;
  const songTitle      = (songData as any)?.title         ?? "";
  const songArtist     = (songData as any)?.artist        ?? "";

  /* Filter logic */
  const filteredIdxs = useMemo(() => {
    return projects
      .map((l, i) => ({ l, i }))
      .filter(({ l }) => {
        if (filter === "hard")     return Number(l.difficulty_score ?? 0) >= 70;
        if (filter === "repeated") return Boolean(l.is_repeated);
        if (filter === "high")     return l.practice_priority === "high";
        return true;
      })
      .map(({ i }) => i);
  }, [projects, filter]);

  const visibleProjects = useMemo(
    () => filteredIdxs.slice(0, visibleCount),
    [filteredIdxs, visibleCount],
  );

  /* Best focus line */
  const focusedIndex = useMemo(() => {
    if (!projects.length) return -1;
    const dream = projects.findIndex(p => (p.line || "").toLowerCase().includes("dream"));
    if (dream >= 0) return dream;
    let best = 0, bestScore = -1;
    for (let i = 0; i < projects.length; i++) {
      const p = projects[i];
      const d = Number(p.difficulty_score ?? 0);
      const pb = p.practice_priority === "high" ? 20 : 0;
      const rb = p.is_repeated ? 8 : 0;
      const s = d + pb + rb;
      if (s > bestScore) { bestScore = s; best = i; }
    }
    return best;
  }, [projects]);

  /* Song-level stats */
  const avgDiff = useMemo(() => {
    if (!projects.length) return 0;
    return Math.round(projects.reduce((a, l) => a + Number(l.difficulty_score ?? 0), 0) / projects.length);
  }, [projects]);

  const dominantEmotion = useMemo(() => {
    if (!projects.length) return "neutral";
    const cnt: Record<string,number> = {};
    projects.forEach(p => { const e = String(p.emotion ?? "neutral"); cnt[e] = (cnt[e] ?? 0) + 1; });
    return Object.entries(cnt).sort((a,b) => b[1]-a[1])[0]?.[0] ?? "neutral";
  }, [projects]);

  const highPriCount = useMemo(() => projects.filter(p => p.practice_priority === "high").length, [projects]);

  /* Progressive reveal */
  useEffect(() => {
    setVisibleCount(0);
    prevVisibleRef.current = 0;
    rowRefs.current = [];
    if (!filteredIdxs.length) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setVisibleCount(i);
      if (i >= filteredIdxs.length) clearInterval(id);
    }, 55);
    return () => clearInterval(id);
  }, [filteredIdxs]);

  /* GSAP stagger reveal */
  useEffect(() => {
    const gsap = typeof window !== "undefined" ? window.gsap : null;
    if (!gsap || !containerRef.current) return;
    const all  = Array.from(containerRef.current.querySelectorAll(".project-item"));
    const prev = prevVisibleRef.current;
    const newOnes = all.slice(prev);
    if (!newOnes.length) return;
    gsap.fromTo(newOnes, { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: 0.04, duration: 0.45, ease: "power2.out" });
    prevVisibleRef.current = visibleCount;
  }, [visibleCount]);

  /* Idle animation */
  const startIdleAnimation = useCallback(() => {
    if (idleAnimationRef.current) return;
    const gsap = typeof window !== "undefined" ? window.gsap : null;
    if (!gsap) return;
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.5 });
    rowRefs.current.forEach((el, i) => {
      if (!el) return;
      tl.to(el, { opacity: 0.04, duration: 0.09, ease: "power2.inOut" }, i * 0.04);
      tl.to(el, { opacity: 1,    duration: 0.09, ease: "power2.inOut" }, visibleCount * 0.04 * 0.5 + i * 0.04);
    });
    idleAnimationRef.current = tl;
  }, [visibleCount]);

  const stopIdleAnimation = useCallback(() => {
    if (!idleAnimationRef.current) return;
    idleAnimationRef.current.kill();
    idleAnimationRef.current = null;
    const gsap = typeof window !== "undefined" ? window.gsap : null;
    if (gsap) rowRefs.current.forEach(el => el && gsap.set(el, { opacity: 1 }));
  }, []);

  const startIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (activeIndex === -1) { setIsIdle(true); startIdleAnimation(); }
    }, CONFIG.idleDelay);
  }, [activeIndex, CONFIG.idleDelay, startIdleAnimation]);

  const stopIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = null;
  }, []);

  useEffect(() => {
    startIdleTimer();
    return () => { stopIdleTimer(); stopIdleAnimation(); };
  }, [startIdleTimer, stopIdleTimer, stopIdleAnimation]);

  /* Hover handlers */
  const handleEnter = useCallback((index: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    stopIdleAnimation();
    stopIdleTimer();
    setIsIdle(false);
    if (activeIndex === index) return;
    setActiveIndex(index);

    /* Emotion background crossfade */
    const realIdx = filteredIdxs[index] ?? index;
    const emotion = String(projects[realIdx]?.emotion ?? "neutral").toLowerCase();
    const bg = EMOTION_GRADIENT[emotion] ?? EMOTION_GRADIENT.neutral;
    if (bgOverlayRef.current) {
      bgOverlayRef.current.style.backgroundImage = bg;
      bgOverlayRef.current.style.opacity = "1";
      bgOverlayRef.current.style.transform = "scale(1.15)";
      bgOverlayRef.current.style.transition = "none";
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!bgOverlayRef.current) return;
        bgOverlayRef.current.style.transition = "opacity 0.45s ease, transform 0.8s cubic-bezier(0.25,0.46,0.45,0.94)";
        bgOverlayRef.current.style.transform = "scale(1)";
      }));
    }
    CALLBACKS?.onProjectHover?.(projects[realIdx]);
  }, [activeIndex, filteredIdxs, projects, stopIdleAnimation, stopIdleTimer, CALLBACKS]);

  const handleLeave = useCallback(() => {
    debounceRef.current = setTimeout(() => CALLBACKS?.onProjectLeave?.(), 50);
  }, [CALLBACKS]);

  const handleContainerLeave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setActiveIndex(-1);
    if (bgOverlayRef.current) bgOverlayRef.current.style.opacity = "0";
    startIdleTimer();
    CALLBACKS?.onContainerLeave?.();
  }, [CALLBACKS, startIdleTimer]);

  const handleRowClick = useCallback((index: number) => {
    setExpandedIndex(cur => cur === index ? null : index);
  }, []);

  /* Auto-expand focus line on mount */
  useEffect(() => {
    if (focusedIndex < 0 || !projects.length) return;
    const posInFiltered = filteredIdxs.indexOf(focusedIndex);
    if (posInFiltered >= 0) setExpandedIndex(posInFiltered);
  }, [projects, focusedIndex, filteredIdxs]);

  if (!projects.length) {
    return (
      <div className="portfolio-shell">
        <div className="empty-state">
          <div className="corner-square" style={{ width: "1rem", height: "1rem" }} />
          <div className="empty-state-title">Analyze a song</div>
          <div className="empty-state-sub">Add artist + title</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="portfolio-shell"
      onMouseLeave={handleContainerLeave}
    >
      {/* Emotion gradient background */}
      <div
        ref={bgOverlayRef}
        className="bg-crossfade"
        style={{ backgroundImage: EMOTION_GRADIENT.neutral }}
        aria-hidden="true"
      />

      {/* Scan overlay */}
      <div className="scan-overlay" aria-hidden="true" />

      {/* ── Stats Bar ── */}
      <div className="stats-bar">
        {songTitle && (
          <div className="stats-item">
            <span className="stats-label">Song</span>
            <span className="stats-value" style={{ fontSize: "0.65rem" }}>{songTitle} — {songArtist}</span>
          </div>
        )}
        <div className="stats-item">
          <span className="stats-label">Lines</span>
          <span className="stats-value">{projects.length}</span>
        </div>
        <div className="stats-item">
          <span className="stats-label">Avg Diff</span>
          <span className="stats-value" style={{ color: avgDiff >= 70 ? "var(--color-accent)" : undefined }}>{avgDiff}/100</span>
        </div>
        <div className="stats-item">
          <span className="stats-label">Dominant</span>
          <span className={`emotion-pill emotion-${dominantEmotion}`} style={{ fontSize: "0.55rem", padding: "0.15rem 0.5rem" }}>
            {dominantEmotion.toUpperCase()}
          </span>
        </div>
        <div className="stats-item">
          <span className="stats-label">High Prio</span>
          <span className="stats-value priority-high">{highPriCount}</span>
        </div>
        <div className="stats-item">
          <span className="stats-label">Singability</span>
          <span className="stats-value">{100 - avgDiff}/100</span>
        </div>
      </div>

      {/* ── Filter Pills ── */}
      <div className="filter-bar">
        {(["all", "hard", "repeated", "high"] as const).map(f => (
          <button
            key={f}
            className={`filter-pill ${filter === f ? "active" : ""}`}
            onClick={() => { setFilter(f); setExpandedIndex(null); }}
          >
            {f === "all" ? "ALL" : f === "hard" ? "HARD 70+" : f === "repeated" ? "REPEATED" : "HIGH PRIO"}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: "0.5rem", color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-primary)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          {visibleProjects.length}/{filteredIdxs.length} lines
        </span>
      </div>

      {/* ── Table Header ── */}
      <div className="lyric-table-header">
        <span>#</span>
        <span>Line</span>
        <span>Romanized</span>
        <span>Translation</span>
        <span>Emotion</span>
        <span style={{ textAlign: "right" }}>Diff</span>
      </div>

      {/* ── Lyric Rows ── */}
      <div className="lyric-rows">
        {visibleProjects.map((realIdx, displayIdx) => {
          const lyric = projects[realIdx];
          if (!lyric) return null;
          return (
            <LyricRow
              key={`${realIdx}-${displayIdx}`}
              lyric={lyric}
              index={displayIdx}
              isActive={activeIndex === displayIdx}
              isIdle={isIdle}
              isFocused={realIdx === focusedIndex}
              isDimmed={activeIndex !== -1 && activeIndex !== displayIdx}
              onEnter={handleEnter}
              onLeave={handleLeave}
              onClick={handleRowClick}
              expanded={expandedIndex === displayIdx}
              setRef={el => { rowRefs.current[displayIdx] = el; }}
            />
          );
        })}
      </div>

      {/* ── Corner Elements ── */}
      <div className="corner-elements" aria-hidden="true">
        <div className="corner-item top-left">
          <div className="corner-square" />
          <span>Mak Ai // AI Coach</span>
        </div>
        <nav className="corner-item top-right">
          <a href={SOCIAL_LINKS.spotify ?? "https://open.spotify.com"} target="_blank" rel="noopener">Spotify</a>
          <span style={{ opacity: 0.2 }}>|</span>
          <a href={SOCIAL_LINKS.email ?? "mailto:user-7760dd13@example.test"}>Email</a>
        </nav>
        <div className="corner-item bottom-left">
          {LOCATION?.display
            ? `${LOCATION.latitude ?? ""} ${LOCATION.longitude ?? ""}`
            : "MAK AI • VOCAL AI"}
        </div>
        <TimeDisplay CONFIG={CONFIG} />
      </div>
    </div>
  );
}
