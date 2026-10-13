"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ProcessSongResponse } from "@/lib/types";

import { Hero }       from "../components/hero";
import { SongInput }  from "../components/song-input";
import { AiLoader }   from "@/components/ui/ai-loader";
import MusicPortfolioImmersive from "@/components/ui/music-portfolio-immersive";

export default function Page() {
  const [data,    setData]    = React.useState<ProcessSongResponse | null>(null);
  const [loading, setLoading] = React.useState(false);

  const analyzeSectionRef = React.useRef<HTMLDivElement | null>(null);

  function scrollToAnalyze() {
    analyzeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#000" }}>

      {/* ── Sticky Nav ── */}
      <nav className="lyrflow-nav">
        <div className="lyrflow-logo">
          <span className="logo-accent-mark" />
          Mak Ai
        </div>
        <div className="nav-links">
          <button className="nav-link-btn" onClick={scrollToAnalyze}>Analyze</button>
          <a href="/demo">Demo</a>
          <span style={{
            fontSize: "0.55rem", textTransform: "uppercase", letterSpacing: "0.12em",
            color: "var(--color-accent)", border: "1px solid var(--color-accent-dim)",
            padding: "0.2rem 0.5rem", cursor: "default",
          }}>
            GPT-4o ◈
          </span>
        </div>
      </nav>

      {/* ── Hero ── */}
      <Hero onPrimaryCTA={scrollToAnalyze} />

      {/* ── Main Analysis Section ── */}
      <main ref={analyzeSectionRef} style={{ maxWidth: "1280px", margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "1.5rem", alignItems: "start" }}>

          {/* Sidebar — sticky */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ position: "sticky", top: "4rem" }}
          >
            <SongInput
              onAnalyzeComplete={res => setData(res)}
              onLoading={v => setLoading(v)}
              onClear={() => setData(null)}
            />
          </motion.div>

          {/* Main output */}
          <section>
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <AiLoader />
                </motion.div>
              ) : (
                <motion.div
                  key="output"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <MusicPortfolioImmersive
                    LYRICS_DATA={data?.lyrics ?? []}
                    SONG_TITLE={data?.title ?? ""}
                    SONG_ARTIST={data?.artist ?? ""}
                    TOTAL_LINES={data?.total_lines ?? (data?.lyrics?.length ?? 0)}
                    KO_LINES={data?.lyrics?.filter((l) => String(l.language).startsWith("ko") || l.language === "ko").length ?? 0}
                    EN_LINES={data?.lyrics?.filter((l) => String(l.language).startsWith("en") || l.language === "en").length ?? 0}
                    JA_LINES={data?.lyrics?.filter((l) => String(l.language).startsWith("ja") || l.language === "ja").length ?? 0}
                    TRANSLATION_LANG={data?.translation_lang ?? "en"}
                    CONFIG={{
                      timeZone:           "America/New_York",
                      timeUpdateInterval: 1000,
                      idleDelay:          3500,
                      debounceDelay:      100,
                    }}
                    LOCATION={{ latitude: "—", longitude: "—", display: false }}
                    CALLBACKS={{
                      onProjectHover:   () => {},
                      onProjectLeave:   () => {},
                      onContainerLeave: () => {},
                    }}
                    SOCIAL_LINKS={{}}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </main>

      {/* ── Bottom branding strip ── */}
      <div style={{
        borderTop: "1px solid var(--color-border)",
        padding: "1rem 2rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div style={{ fontSize: "0.5rem", textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,255,255,0.15)", fontFamily: "var(--font-primary)" }}>
          © 2025 Mak Ai
        </div>
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: "4px", height: "4px", background: "var(--color-accent)", opacity: 0.3 + i * 0.3, borderRadius: "50%", animation: `glowPulse ${1.5 + i * 0.3}s ease-in-out infinite` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
