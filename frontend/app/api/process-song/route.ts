import { NextResponse } from "next/server";

const base =
  (process.env.NEXT_PUBLIC_LYRFLOW_API_BASE_URL ?? "").trim() || "http://127.0.0.1:7860";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { title, artist } = body ?? {};
    let translation_lang = String(body?.translation_lang ?? "en").trim().toLowerCase();
    if (!["en", "fr"].includes(translation_lang)) translation_lang = "en";

    let res: Response;
    try {
      res = await fetch(`${base}/api/process-song`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Lyrflow-Client": "local-console" },
        body: JSON.stringify({ title, artist, translation_lang }),
      });
    } catch (e: any) {
      return NextResponse.json(
        {
          error: "Backend not reachable from Next server.",
          details: e?.message ?? String(e),
          backend: `${base}/api/process-song`,
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
        // Backend is likely returning an HTML error page.
        const preview = raw.trim().slice(0, 200);
        if (preview.startsWith("<")) {
          return NextResponse.json(
            {
              error: "Backend returned non-JSON (HTML). Check backend is running.",
              preview,
            },
            { status: 502 },
          );
        }
        return NextResponse.json(
          { error: "Backend returned invalid JSON.", preview },
          { status: 502 },
        );
      }
    }
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "Unexpected proxy error in /api/process-song.",
        details: e?.message ?? String(e),
        backend: `${base}/api/process-song`,
      },
      { status: 500 },
    );
  }
}

