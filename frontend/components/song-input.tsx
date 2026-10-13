"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles } from "lucide-react";

import type { ProcessSongResponse } from "@/lib/types";
import { fetchJob, fetchSongList, submitProcessSong } from "@/lib/api";

type Song = { title: string; artist: string };

const MOCK_RESPONSE: ProcessSongResponse = {
  title: "Demo", artist: "Mak Ai", language: "mixed_ko", total_lines: 3, avg_difficulty: 61,
  singability_score: 39, dominant_emotion: "hype",
  lyrics: [
    { index: 0, line: "나는 dream을 꿔", romanized: "naneun dream-eul kkwo",
      translation: "I dream beyond reality", syllables: "na-neun kkwo", difficulty_score: 68,
      emotion: "hype", practice_priority: "medium", confidence: "high",
      phoneme_hints: "Focus on the 'kkw' sound—release the k cleanly.", phoneme_map: [] } as any,
    { index: 1, line: "oh yeah la la la", romanized: "oh yeah la la la",
      translation: "Oh yeah, sing it like a wave", syllables: "", difficulty_score: 18,
      emotion: "playful", practice_priority: "low", confidence: "high",
      phoneme_hints: "", phoneme_map: [] } as any,
    { index: 2, line: "僕は okay", romanized: "boku wa okay",
      translation: "I'm okay, even when things change", syllables: "bo-ku-wa o-kei",
      difficulty_score: 42, emotion: "soft", practice_priority: "medium", confidence: "high",
      phoneme_hints: "Keep vowels clean: 'bo' and 'ku' stay light.", phoneme_map: [] } as any,
  ],
};

const ANALYSIS_STEPS = [
  { key: "fetch",    label: "Fetching Lyrics" },
  { key: "clean",   label: "Cleaning Text" },
  { key: "ai",      label: "AI Processing" },
  { key: "score",   label: "Scoring & Emotion" },
  { key: "done",    label: "Done" },
];

function detectLangFlag(text: string): string {
  const hangul   = /[\uAC00-\uD7A3\u1100-\u11FF]/.test(text);
  const japanese = /[\u3040-\u30FF\u4E00-\u9FFF]/.test(text);
  if (hangul && japanese) return "🌐";
  if (hangul)   return "🇰🇷";
  if (japanese) return "🇯🇵";
  return "";
}

const MAX_RECENT = 5;
const RECENT_KEY = "lyrflow_recent";

function loadRecent(): Song[] {
  try {
    const s = localStorage.getItem(RECENT_KEY);
    return s ? (JSON.parse(s) as Song[]) : [];
  } catch { return []; }
}

function saveRecent(song: Song) {
  try {
    const prev = loadRecent().filter(s => !(s.title === song.title && s.artist === song.artist));
    localStorage.setItem(RECENT_KEY, JSON.stringify([song, ...prev].slice(0, MAX_RECENT)));
  } catch {}
}

export function SongInput({
  onAnalyzeComplete, onLoading, onClear,
}: {
  onAnalyzeComplete: (res: ProcessSongResponse) => void;
  onLoading: (v: boolean) => void;
  onClear: () => void;
}) {
  const [songs,        setSongs]        = React.useState<Song[]>([]);
  const [query,        setQuery]        = React.useState("");
  const [customArtist, setCustomArtist] = React.useState("");
  const [customTitle,  setCustomTitle]  = React.useState("");
  const [selected,     setSelected]     = React.useState<Song | null>(null);
  const [error,        setError]        = React.useState<string | null>(null);
  const [working,      setWorking]      = React.useState(false);
  const [stepIdx,      setStepIdx]      = React.useState(-1);
  const [recent,       setRecent]       = React.useState<Song[]>([]);
  const [highlightIdx, setHighlightIdx] = React.useState(-1);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [translationLang, setTranslationLang] = React.useState<"en" | "fr">("en");

  React.useEffect(() => {
    setRecent(loadRecent());
    fetchSongList().then(d => setSongs(d.songs || [])).catch(() => setSongs([]));
  }, []);

  const suggestions = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return songs.filter(s => `${s.artist} ${s.title}`.toLowerCase().includes(q)).slice(0, 8);
  }, [query, songs]);

  const langFlag = React.useMemo(
    () => detectLangFlag(customTitle + " " + customArtist + " " + query),
    [customTitle, customArtist, query],
  );

  React.useEffect(() => {
    setShowDropdown(suggestions.length > 0 && query.trim().length > 0);
    setHighlightIdx(-1);
  }, [suggestions, query]);

  function pickSuggestion(s: Song) {
    setSelected(s);
    setQuery(`${s.title} — ${s.artist}`);
    setShowDropdown(false);
  }

  function handleQueryKey(e: React.KeyboardEvent) {
    if (!showDropdown) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlightIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setHighlightIdx(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && highlightIdx >= 0) { e.preventDefault(); pickSuggestion(suggestions[highlightIdx]); }
    if (e.key === "Escape")    { setShowDropdown(false); setHighlightIdx(-1); }
  }

  async function analyze() {
    const title  = customTitle.trim()  || selected?.title  || "";
    const artist = customArtist.trim() || selected?.artist || "";
    if (!title || !artist) { setError("Add artist + title to begin."); return; }

    setError(null);
    onClear();
    setWorking(true);
    onLoading(true);
    setStepIdx(0);

    // save to recent
    saveRecent({ title, artist });
    setRecent(loadRecent());

    const stepTimer = setInterval(() => {
      setStepIdx(i => (i < ANALYSIS_STEPS.length - 2 ? i + 1 : i));
    }, 8000);

    try {
      const sub   = await submitProcessSong(title, artist, translationLang);
      const jobId = sub.job_id;
      const started = Date.now();
      const timeout = 150_000;
      while (Date.now() - started < timeout) {
        const job = await fetchJob(jobId);
        if (job.status === "done") {
          if (job.result?.error) throw new Error(job.result.error);
          setStepIdx(ANALYSIS_STEPS.length - 1);
          onAnalyzeComplete(job.result as ProcessSongResponse);
          return;
        }
        if (job.status === "error") throw new Error(job.error || "Job failed.");
        await new Promise(r => setTimeout(r, 1100));
      }
      throw new Error("Timed out waiting for AI response.");
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
      // Backend failure पर mock lyrics दिखाने से user को लगता है "song मिला",
      // जबकि असल में job failed/JSON invalid था। इसलिए lyrics खाली रखें।
      onAnalyzeComplete({
        ...(MOCK_RESPONSE as any),
        title: title || MOCK_RESPONSE.title,
        artist: artist || MOCK_RESPONSE.artist,
        lyrics: [],
        total_lines: 0,
        avg_difficulty: undefined,
        singability_score: undefined,
        dominant_emotion: undefined,
        error: e?.message || "Something went wrong.",
      });
    } finally {
      clearInterval(stepTimer);
      setWorking(false);
      onLoading(false);
      setStepIdx(-1);
    }
  }

  return (
    <div className="input-panel">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", borderBottom: "1px solid var(--color-border)", paddingBottom: "1rem" }}>
        <div>
          <div className="input-panel-title">Vocal Coach</div>
          <div style={{ fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "0.2rem", opacity: 0.65 }}>
            Analyze
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.5rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-accent)", border: "1px solid var(--color-accent-dim)", padding: "0.25rem 0.6rem" }}>
          <Sparkles size={10} />
          GPT-4o
        </div>
      </div>

      {/* Output language */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.55rem", textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.65 }}>
          Translation
        </div>
        <div style={{ display: "inline-flex", border: "1px solid var(--color-accent-dim)", borderRadius: 9999, overflow: "hidden" }}>
          <button
            type="button"
            onClick={() => setTranslationLang("en")}
            disabled={working}
            style={{
              padding: "0.45rem 0.75rem",
              fontSize: "0.6rem",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              background: translationLang === "en" ? "rgba(255,223,0,0.15)" : "rgba(255,255,255,0.04)",
              color: translationLang === "en" ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.65)",
              border: "none",
              cursor: "pointer",
            }}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setTranslationLang("fr")}
            disabled={working}
            style={{
              padding: "0.45rem 0.75rem",
              fontSize: "0.6rem",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              background: translationLang === "fr" ? "rgba(255,223,0,0.15)" : "rgba(255,255,255,0.04)",
              color: translationLang === "fr" ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.65)",
              border: "none",
              cursor: "pointer",
            }}
          >
            FR
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: "1rem" }}>
        <div style={{ position: "relative" }}>
          <Search size={12} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.25)" }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleQueryKey}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            placeholder="Search for a song..."
            disabled={working}
            style={{ paddingLeft: "2rem" }}
          />
          {langFlag && (
            <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "1rem" }}>{langFlag}</span>
          )}
        </div>

        {/* Suggestions dropdown */}
        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="suggestions-dropdown"
            >
              {suggestions.map((s, i) => (
                <div
                  key={`${s.artist}-${s.title}`}
                  className={`suggestion-item ${i === highlightIdx ? "highlighted" : ""}`}
                  onClick={() => pickSuggestion(s)}
                >
                  <div className="suggestion-title">{s.title}</div>
                  <div className="suggestion-artist">{s.artist}</div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Artist + Title */}
      <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <div>
          <input
            value={customArtist}
            onChange={e => { setCustomArtist(e.target.value); setSelected(null); }}
            placeholder={selected?.artist ?? "e.g. NewJeans"}
            disabled={working}
          />
        </div>
        <div>
          <input
            value={customTitle}
            onChange={e => { setCustomTitle(e.target.value); setSelected(null); }}
            placeholder={selected?.title ?? "e.g. Hype Boy"}
            disabled={working}
          />
        </div>
      </div>

      {/* Analyze button */}
      <button className="btn-primary" onClick={analyze} disabled={working} style={{ width: "100%" }}>
        {working ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="waveform-bars" style={{ height: "12px" }}>
              {[0,1,2,3].map(i => (
                <span key={i} className="waveform-bar" style={{ animationDelay: `${i * 0.12}s`, height: "12px" }} />
              ))}
            </span>
            Analyzing...
          </span>
        ) : "Analyze"}
      </button>

      {/* Progress steps (when working) */}
      <AnimatePresence>
        {working && stepIdx >= 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: "hidden" }}
          >
            <div className="progress-steps" style={{ marginTop: "1rem" }}>
              {ANALYSIS_STEPS.map((s, i) => (
                <div key={s.key} className={`progress-step ${i < stepIdx ? "done" : i === stepIdx ? "active" : ""}`}>
                  {s.label}
                </div>
              ))}
            </div>
            <div className="progress-bar-outer">
              <div className="progress-bar-inner" style={{ width: `${Math.round(((stepIdx + 1) / ANALYSIS_STEPS.length) * 100)}%` }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected info */}
      {selected && !working && (
        <div style={{ marginTop: "0.75rem", fontSize: "0.55rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)" }}>
          ◈ {selected.title} — {selected.artist}
        </div>
      )}

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ marginTop: "1rem", padding: "0.75rem", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)" }}
        >
          <div style={{ fontSize: "0.55rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "rgb(239,68,68)", marginBottom: "0.25rem" }}>Error</div>
          <div style={{ fontSize: "0.65rem", color: "rgba(255,100,100,0.8)" }}>{error}</div>
        </motion.div>
      )}

      {/* Recently Analyzed */}
      {recent.length > 0 && !working && (
        <div style={{ marginTop: "1.5rem" }}>
          <div style={{ fontSize: "0.5rem", textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,255,255,0.2)", marginBottom: "0.5rem" }}>Recent</div>
          {recent.map((r, i) => (
            <div
              key={i}
              className="recent-item"
              onClick={() => { setCustomTitle(r.title); setCustomArtist(r.artist); setSelected(null); }}
            >
              <span className="recent-label">{r.title} — {r.artist}</span>
              <span className="recent-arrow">→</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
