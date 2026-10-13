"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  { key: "fetch",     label: "Fetching Lyrics" },
  { key: "clean",     label: "Cleaning Text" },
  { key: "ai",        label: "AI Linguistic Engine" },
  { key: "score",     label: "Scoring & Emotion" },
  { key: "assemble",  label: "Assembling Output" },
];

const STEP_ORDER = STEPS.map(s => s.key);

const KPOP_PHRASES = [
  "na-neun kkum-eul kkwo",
  "sa-rang-hae yo",
  "mo-reu-ge-sseo yo",
  "bul-leo yo",
  "deo ga-ga",
  "na-ege man-hae jwo",
];

export function AiLoader() {
  const [stepIdx, setStepIdx] = React.useState(0);
  const [phraseIdx, setPhraseIdx] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(() => {
      setStepIdx(i => (i < STEPS.length - 1 ? i + 1 : i));
    }, 4000);
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    const id = setInterval(() => {
      setPhraseIdx(i => (i + 1) % KPOP_PHRASES.length);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  const pct = Math.round(((stepIdx + 1) / STEPS.length) * 100);
  const circumference = 2 * Math.PI * 44; // r=44

  return (
    <div className="loader-shell">
      {/* SVG ring */}
      <div className="loader-ring-wrap">
        {/* Rotating outer ring */}
        <svg
          width="120"
          height="120"
          style={{ position: "absolute", inset: 0, animation: "rotate 3s linear infinite" }}
          aria-hidden="true"
        >
          <circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke="rgba(255,223,0,0.12)"
            strokeWidth="1"
          />
          <circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke="rgba(255,223,0,0.5)"
            strokeWidth="1"
            strokeDasharray="12 340"
            strokeLinecap="round"
          />
        </svg>

        {/* Progress arc */}
        <svg
          width="120"
          height="120"
          style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}
          aria-hidden="true"
        >
          <circle
            cx="60" cy="60" r="44"
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="2"
          />
          <motion.circle
            cx="60" cy="60" r="44"
            fill="none"
            stroke="rgb(255,223,0)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: circumference - (circumference * pct) / 100 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </svg>

        {/* Centre text */}
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: "0.1rem",
        }}>
          <span style={{ fontFamily: "var(--font-primary)", fontSize: "1.1rem", fontWeight: 700, color: "var(--color-accent)" }}>
            {pct}%
          </span>
          <span style={{ fontFamily: "var(--font-primary)", fontSize: "0.45rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.25)" }}>
            processing
          </span>
        </div>
      </div>

      {/* Floating K-pop phrase */}
      <AnimatePresence mode="wait">
        <motion.div
          key={phraseIdx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.4 }}
          style={{
            fontFamily: "var(--font-primary)",
            fontSize: "0.7rem",
            color: "var(--color-accent)",
            textTransform: "lowercase",
            letterSpacing: "0.08em",
            minHeight: "1.2rem",
          }}
        >
          {KPOP_PHRASES[phraseIdx]}
        </motion.div>
      </AnimatePresence>

      {/* Step list */}
      <div className="progress-steps" style={{ width: "100%", maxWidth: "220px" }}>
        {STEPS.map((s, i) => (
          <div
            key={s.key}
            className={`progress-step ${i < stepIdx ? "done" : i === stepIdx ? "active" : ""}`}
          >
            {s.label}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="progress-bar-outer" style={{ width: "100%", maxWidth: "220px" }}>
        <motion.div
          className="progress-bar-inner"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
