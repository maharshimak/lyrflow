"use client";

import * as React from "react";
import { motion } from "framer-motion";

import MusicPortfolioImmersive from "@/components/ui/music-portfolio-immersive";
import { AiLoader } from "@/components/ui/ai-loader";
import type { LyricLine, ProcessSongResponse } from "@/lib/types";
import { fetchJob, submitProcessSong } from "@/lib/api";

export default function DemoPage() {
  const [lyrics, setLyrics] = React.useState<LyricLine[]>([]);
  const [working, setWorking] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  // Hardcoded demo inputs (PPT corpus aligned).
  const demoTitle = "No More Dream";
  const demoArtist = "BTS";

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      setWorking(true);
      setError(null);
      try {
        const sub = await submitProcessSong(demoTitle, demoArtist, "en");
        const jobId = sub.job_id;

        const started = Date.now();
        const timeoutMs = 180000;

        while (!cancelled && Date.now() - started < timeoutMs) {
          const job = await fetchJob(jobId);
          if (job.status === "done") {
            if (job.error) throw new Error(job.error);

            const result = job.result as ProcessSongResponse | undefined;
            if (!result) throw new Error("Missing result from backend.");

            const mapped: LyricLine[] = (result.lyrics ?? []).map((l, i) => ({
              id: l.index ?? i,
              index: l.index ?? i,
              line: l.line,
              romanized: l.romanized,
              translation: l.translation,
              syllables: l.syllables,
              difficulty_score: Number(l.difficulty_score ?? 0),
              emotion: String(l.emotion ?? "neutral"),
              practice_priority: String(l.practice_priority ?? "medium"),
              confidence: (l.confidence as any) ?? "high",
              phoneme_hints: (l as any).phoneme_hints ?? "",
              phoneme_map: (l as any).phoneme_map ?? [],
              is_repeated: (l as any).is_repeated ?? false,
              language: (l.language as any) ?? "en",
            }));

            if (!cancelled) setLyrics(mapped);
            return;
          }
          if (job.status === "error") {
            throw new Error(job.error || "Job failed.");
          }
          await new Promise((r) => setTimeout(r, 900));
        }

        throw new Error("Timed out waiting for processing.");
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Something went wrong.");
          // keep lyrics empty; component will show idle animation.
        }
      } finally {
        if (!cancelled) setWorking(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const config = {
    timeZone: "America/New_York",
    timeUpdateInterval: 1000,
    idleDelay: 3500,
    debounceDelay: 100,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <div className="text-sm text-white/60 mb-2">Lyric Coach Demo</div>
        <div className="text-xl font-extrabold">{demoTitle}</div>
        <div className="text-sm text-white/60 mt-1">{demoArtist}</div>
      </motion.div>

      {error ? (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
          <div className="font-semibold">Error</div>
          <div className="mt-1">{error}</div>
        </div>
      ) : null}

      <MusicPortfolioImmersive
        LYRICS_DATA={lyrics}
        SONG_TITLE={demoTitle}
        SONG_ARTIST={demoArtist}
        TOTAL_LINES={lyrics.length}
        KO_LINES={lyrics.filter((l) => String(l.language).startsWith("ko") || l.language === "ko").length}
        EN_LINES={lyrics.filter((l) => String(l.language).startsWith("en") || l.language === "en").length}
        JA_LINES={lyrics.filter((l) => String(l.language).startsWith("ja") || l.language === "ja").length}
        TRANSLATION_LANG="en"
        CONFIG={config}
        LOCATION={{ latitude: "—", longitude: "—", display: false }}
        CALLBACKS={{ onProjectHover: () => {} }}
        SOCIAL_LINKS={{}}
      />

      {working ? (
        <div className="mt-4">
          <AiLoader />
        </div>
      ) : null}
    </div>
  );
}

