import { NextResponse } from "next/server";

const base =
  (process.env.NEXT_PUBLIC_LYRFLOW_API_BASE_URL ?? "").trim() || "http://127.0.0.1:7860";

export const runtime = "nodejs";

export async function GET() {
  try {
    let res: Response;
    try {
      res = await fetch(`${base}/api/song-list`, { cache: "no-store" });
    } catch (e: any) {
      return NextResponse.json(
        {
          error: "Backend not reachable from Next server.",
          details: e?.message ?? String(e),
          backend: `${base}/api/song-list`,
        },
        { status: 502 },
      );
    }

    const raw = await res.text();
    let data: any = {};
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        if (raw.trim().startsWith("<")) {
          return NextResponse.json(
            { error: "Backend returned non-JSON (HTML). Check backend is running.", preview: raw.slice(0, 200) },
            { status: 502 },
          );
        }
        return NextResponse.json(
          { error: "Backend returned invalid JSON.", preview: raw.slice(0, 200) },
          { status: 502 },
        );
      }
    }
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "Unexpected proxy error in /api/song-list.",
        details: e?.message ?? String(e),
        backend: `${base}/api/song-list`,
      },
      { status: 500 },
    );
  }
}

