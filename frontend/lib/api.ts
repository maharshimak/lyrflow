import type { ProcessSongResponse } from "./types";

function looksLikeFlaskBase(url: string) {
  // Mak Ai app backend runs on 7860 (see web_server.py).
  // If someone accidentally sets NEXT_PUBLIC_LYRFLOW_API_BASE_URL to Next.js (3000),
  // we'd otherwise fetch HTML error overlays instead of JSON.
  return /\/?$/.test(url) ? url.includes(":7860") : url.includes(":7860");
}

const RAW_CANDIDATE_BASES: string[] = [
  process.env.NEXT_PUBLIC_LYRFLOW_API_BASE_URL ?? "",
  "http://127.0.0.1:7860",
  "http://localhost:7860",
  "http://0.0.0.0:7860",
  "http://[::1]:7860",
].filter(Boolean);

const CANDIDATE_BASES: string[] = Array.from(new Set(RAW_CANDIDATE_BASES.filter(looksLikeFlaskBase)));

async function fetchTextFromAnyBase(
  path: string,
  init: RequestInit & { cache?: RequestCache } = {},
): Promise<{ base: string; res: Response; raw: string }> {
  let lastErr: any = null;
  for (const b of CANDIDATE_BASES) {
    const url = `${b}${path.startsWith("/") ? "" : "/"}${path}`;
    try {
      const res = await fetch(url, init);
      const raw = await res.text();
      return { base: b, res, raw };
    } catch (e: any) {
      lastErr = e;
    }
  }

  // Final fallback: use Next.js server-side proxy routes (/api/*).
  // This avoids browser-side CORS/network restrictions when Flask is reachable
  // from the Next server but not from the browser.
  try {
    const res = await fetch(path, init);
    const raw = await res.text();
    return { base: "same-origin-next-proxy", res, raw };
  } catch (e: any) {
    lastErr = e;
  }

  const tried = CANDIDATE_BASES.map((x) => x.replace(/\/+$/, "")).join(", ");
  const hint = lastErr?.message ? ` Last error: ${lastErr.message}` : "";
  throw new Error(`Failed to fetch backend. Tried: ${tried}.${hint}`);
}

// Backend Flask में CORS `*` पहले से सेट है, इसलिए हम `/api/*` Next proxy bypass करके
// directly Flask endpoints कॉल करते हैं (Next route 500/HTML issue से बचने के लिए).
export async function fetchSongList(): Promise<{ songs: { title: string; artist: string }[] }> {
  const { res, raw, base } = await fetchTextFromAnyBase("/api/song-list", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load song list");
  try {
    return raw ? JSON.parse(raw) : { songs: [] };
  } catch {
    const preview = raw?.trim()?.slice(0, 240) ?? "";
    if (raw?.trim().startsWith("<")) {
      throw new Error(`Non-JSON (HTML) response from /api/song-list (base=${base}). Preview: ${preview}`);
    }
    throw new Error(`Invalid JSON response from /api/song-list (base=${base}). Preview: ${preview}`);
  }
}

export async function submitProcessSong(
  title: string,
  artist: string,
  translation_lang: "en" | "fr" = "en",
): Promise<{ job_id: string }> {
  const { res, raw, base } = await fetchTextFromAnyBase("/api/process-song", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, artist, translation_lang }),
  });
  let data: any = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    const preview = raw?.trim()?.slice(0, 240) ?? "";
    if (raw?.trim().startsWith("<")) {
      throw new Error(
        `Non-JSON (HTML) response from /api/process-song (base=${base}). Preview: ${preview}`,
      );
    }
    throw new Error(`Invalid JSON response from /api/process-song (base=${base}). Preview: ${preview}`);
  }
  if (!res.ok) throw new Error(data?.error || "Failed to submit");
  return data;
}

export async function fetchJob(jobId: string): Promise<{ status: string; result?: ProcessSongResponse; error?: string }> {
  const { res, raw, base } = await fetchTextFromAnyBase(`/api/job/${jobId}`, { cache: "no-store" });
  let data: any = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    const preview = raw?.trim()?.slice(0, 240) ?? "";
    if (raw?.trim().startsWith("<")) {
      throw new Error(`Non-JSON (HTML) response from /api/job/${jobId} (base=${base}). Preview: ${preview}`);
    }
    throw new Error(`Invalid JSON response from /api/job/${jobId} (base=${base}). Preview: ${preview}`);
  }
  return {
    status: data.status,
    result: data.result,
    error: data.error ?? data?.result?.error,
  };
}

