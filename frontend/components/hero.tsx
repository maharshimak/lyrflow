"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function Hero({ onPrimaryCTA }: { onPrimaryCTA: () => void }) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const rotXMV   = useMotionValue(0);
  const rotYMV   = useMotionValue(0);
  const rotX     = useSpring(rotXMV, { stiffness: 200, damping: 25 });
  const rotY     = useSpring(rotYMV, { stiffness: 200, damping: 25 });

  // 3-D tilt on waveform card
  function onCardMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width  - 0.5;
    const y = (e.clientY - rect.top)  / rect.height - 0.5;
    rotYMV.set(x * 16);
    rotXMV.set(-y * 12);
  }
  function onCardLeave() { rotXMV.set(0); rotYMV.set(0); }

  // Waveform interactive — bars near cursor grow
  const [mouseRatio, setMouseRatio] = React.useState(0.5);
  const bars = React.useMemo(() => Array.from({ length: 28 }, (_, i) => i), []);

  // Typewriter chars
  const words = ["VOCAL COACH"];
  const [displayed, setDisplayed] = React.useState("");
  const [charIdx,   setCharIdx]   = React.useState(0);
  React.useEffect(() => {
    const target = words[0];
    if (charIdx >= target.length) return;
    const id = setTimeout(() => {
      setDisplayed(target.slice(0, charIdx + 1));
      setCharIdx(c => c + 1);
    }, 65);
    return () => clearTimeout(id);
  }, [charIdx]); // eslint-disable-line

  const stats = [
    { label: "K-pop / J-pop / EN", icon: "◈" },
    { label: "GPT-4o",     icon: "◉" },
    { label: "Real-time",  icon: "◌" },
  ];

  return (
    <header className="hero-shell">
      {/* Scanline */}
      <div className="scan-overlay" aria-hidden="true" />

      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          >
            {/* Badge */}
            <div className="hero-badge">
              <span className="logo-accent-mark" />
              Mak Ai &nbsp;//&nbsp; Vocal Coach
            </div>

            {/* Title */}
            <h1 className="hero-title">
              Turn Any Song Into A{" "}
              <span className="accent">
                {displayed}
                <span className="time-blink" style={{ fontWeight: 400 }}>_</span>
              </span>
            </h1>

            {/* Sub */}
            <p className="hero-sub">
              Romanize. Understand. Sing. Improve.
              <br />
              Built to feel musical, fast, and intelligent.
            </p>

            {/* Pill stats */}
            <motion.div
              className="flex flex-wrap gap-3 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.4 }}
            >
              {stats.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  style={{
                    display:         "inline-flex",
                    alignItems:      "center",
                    gap:             "0.4rem",
                    fontSize:        "0.55rem",
                    textTransform:   "uppercase",
                    letterSpacing:   "0.12em",
                    color:           "rgba(255,255,255,0.4)",
                    border:          "1px solid rgba(255,255,255,0.1)",
                    padding:         "0.3rem 0.75rem",
                    fontFamily:      "var(--font-primary)",
                  }}
                >
                  <span style={{ color: "var(--color-accent)", fontSize: "0.7rem" }}>{s.icon}</span>
                  {s.label}
                </motion.div>
              ))}
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="flex items-center gap-4"
            >
              <button className="btn-primary" onClick={onPrimaryCTA}>
                Start Singing →
              </button>
              <span style={{ fontSize: "0.55rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-primary)" }}>
                K-pop / J-pop / EN
              </span>
            </motion.div>
          </motion.div>

          {/* Right — 3-D waveform card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y:  0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
          >
            <motion.div
              ref={cardRef}
              onMouseMove={onCardMove}
              onMouseLeave={onCardLeave}
              onMouseMoveCapture={e => {
                const el = cardRef.current;
                if (!el) return;
                const rect = el.getBoundingClientRect();
                setMouseRatio((e.clientX - rect.left) / rect.width);
              }}
              style={{
                rotateX: rotX,
                rotateY: rotY,
                transformPerspective: 900,
                border:     "1px solid rgba(255,223,0,0.15)",
                background: "rgba(0,0,0,0.92)",
                padding:    "2rem",
                position:   "relative",
                overflow:   "hidden",
              }}
            >
              {/* Scan */}
              <div className="scan-overlay" aria-hidden="true" />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
                <div>
                  <div style={{ fontSize: "0.5rem", textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,223,0,0.5)", fontFamily: "var(--font-primary)" }}>
                    Live Waveform
                  </div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "0.3rem", fontFamily: "var(--font-primary)" }}>
                    Your Lyrics, Tuned.
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: i === 0 ? "var(--color-accent)" : "rgba(255,255,255,0.15)" }} />
                  ))}
                </div>
              </div>

              {/* Interactive waveform */}
              <div className="flex items-end justify-center gap-[4px]" style={{ height: "80px" }}>
                {bars.map(i => {
                  const pos  = i / bars.length;
                  const dist = Math.abs(pos - mouseRatio);
                  const boost = Math.max(0, 1 - dist * 4);
                  const baseH = 12 + (i % 5) * 6;
                  const h = baseH + boost * 36;
                  return (
                    <motion.div
                      key={i}
                      style={{ width: "4px", borderRadius: "2px 2px 0 0", background: "var(--color-accent)", opacity: 0.4 + boost * 0.6 }}
                      animate={{ height: [h, h * 0.5, h], opacity: [0.4 + boost * 0.6, 0.6, 0.4 + boost * 0.6] }}
                      transition={{ duration: 1.4 + (i % 5) * 0.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.025 }}
                    />
                  );
                })}
              </div>

              <div style={{ marginTop: "1.25rem", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-primary)" }}>
                Scramble text · Emotion · Difficulty
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </header>
  );
}
