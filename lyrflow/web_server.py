"""
web_server.py — Animated UI backend for Mak Ai.

Runs a small Flask API:
- GET  /api/song-list
- POST /api/process-song
- GET  /api/job/<job_id>
- GET  /api/job/<job_id>/stream   (Server-Sent Events progress)
"""

from __future__ import annotations

import json
import os
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from flask import Flask, Response, jsonify, request, send_from_directory

from lyrflow.config import GENIUS_API_KEY, OPENAI_API_KEY, SONG_LIST
from lyrflow.pipeline import process_song, _update_progress

_BASE_DIR = os.path.dirname(__file__)
_UI_DIR = os.path.join(_BASE_DIR, "ui")

app = Flask(__name__, static_folder="ui", static_url_path="")
app.config["MAX_CONTENT_LENGTH"] = 16000

@app.before_request
def local_boundary() -> Any:
    if request.remote_addr not in {"127.0.0.1", "::1"}:
        return jsonify({"error": "Loopback access only"}), 403
    if request.host.split(":")[0] not in {"localhost", "127.0.0.1"}:
        return jsonify({"error": "Untrusted host"}), 403
    origin = request.headers.get("Origin")
    if origin and origin not in {"http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:7860", "http://127.0.0.1:7860"}:
        return jsonify({"error": "Untrusted origin"}), 403
    if request.method == "POST" and request.headers.get("X-Lyrflow-Client") != "local-console":
        return jsonify({"error": "Local client header required"}), 403
    return None

_executor = ThreadPoolExecutor(max_workers=4)
_jobs: dict[str, dict[str, Any]] = {}
_jobs_lock = threading.Lock()


def _set_job(job_id: str, patch: dict[str, Any]) -> None:
    with _jobs_lock:
        job = _jobs.get(job_id)
        if not job:
            return
        job.update(patch)


def _run_job(job_id: str, title: str, artist: str, translation_lang: str) -> None:
    try:
        result = process_song(
            title,
            artist,
            GENIUS_API_KEY,
            OPENAI_API_KEY,
            job_id=job_id,
            translation_lang=translation_lang,
        )
        _set_job(job_id, {"status": "done", "result": result, "step": "done", "pct": 100})
    except Exception as e:
        _set_job(job_id, {"status": "error", "error": "Processing failed; inspect local server logs"})


def _add_cors(response: Response) -> Response:
    response.headers["Access-Control-Allow-Origin"] = request.headers.get("Origin", "http://127.0.0.1:3000")
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Lyrflow-Client"
    return response


@app.after_request
def after_request(response: Response) -> Response:
    return _add_cors(response)


@app.route("/", methods=["OPTIONS"])
@app.route("/api/song-list", methods=["OPTIONS"])
@app.route("/api/process-song", methods=["OPTIONS"])
def handle_options() -> Any:
    resp = Response()
    resp.headers["Access-Control-Allow-Origin"] = request.headers.get("Origin", "http://127.0.0.1:3000")
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Lyrflow-Client"
    return resp


@app.get("/")
def index() -> Any:
    return send_from_directory(_UI_DIR, "index.html")


@app.get("/ui/<path:path>")
def ui_static(path: str) -> Any:
    return send_from_directory(_UI_DIR, path)


@app.get("/api/song-list")
def api_song_list() -> Any:
    return jsonify({"songs": SONG_LIST})


@app.post("/api/process-song")
def api_process_song() -> Any:
    data = request.get_json(silent=True) or {}
    if not isinstance(data, dict) or not isinstance(data.get("title"), str) or not isinstance(data.get("artist"), str):
        return jsonify({"error": "title and artist must be strings"}), 400
    title = data.get("title", "").strip()
    artist = data.get("artist", "").strip()
    translation_lang = str(data.get("translation_lang", "en") or "en").strip().lower()
    if translation_lang not in ("en", "fr"):
        translation_lang = "en"

    if not title or not artist or len(title) > 200 or len(artist) > 200:
        return jsonify({"error": "Missing 'title' or 'artist'"}), 400

    job_id = str(uuid.uuid4())
    with _jobs_lock:
        now=time.time()
        stale=[ident for ident, job in _jobs.items() if job.get("status") in {"done", "error"} and now-job.get("created", now)>600]
        for ident in stale:
            del _jobs[ident]
        if len(_jobs)>=32 or sum(job.get("status") not in {"done", "error"} for job in _jobs.values())>=4:
            return jsonify({"error": "Job capacity reached; retry later"}), 429
        _jobs[job_id] = {"status": "queued", "step": "queued", "pct": 0, "created": now}

    _set_job(job_id, {"status": "running", "title": title, "artist": artist, "step": "starting", "pct": 2})
    _executor.submit(_run_job, job_id, title, artist, translation_lang)

    return jsonify({"job_id": job_id})


@app.get("/api/job/<job_id>")
def api_job(job_id: str) -> Any:
    with _jobs_lock:
        job = _jobs.get(job_id)
        if not job:
            return jsonify({"error": "Unknown job_id"}), 404

        status = job.get("status", "queued")
        if status == "done":
            return jsonify({"job_id": job_id, "status": status, "result": job.get("result")})
        if status == "error":
            return jsonify({"job_id": job_id, "status": status, "error": job.get("error")})
        return jsonify({
            "job_id": job_id,
            "status": status,
            "step": job.get("step", "running"),
            "pct": job.get("pct", 0),
        })


@app.get("/api/job/<job_id>/stream")
def api_job_stream(job_id: str) -> Any:
    """Server-Sent Events endpoint for real-time job progress."""

    def generate():
        max_wait = 180  # seconds
        tick = 0
        while tick < max_wait * 4:
            tick += 1
            with _jobs_lock:
                job = _jobs.get(job_id)

            if not job:
                yield f"data: {json.dumps({'error': 'unknown job'})}\n\n"
                break

            status = job.get("status", "queued")
            step = job.get("step", "running")
            pct = job.get("pct", 0)

            payload = json.dumps({"status": status, "step": step, "pct": pct})
            yield f"data: {payload}\n\n"

            if status in ("done", "error"):
                break

            time.sleep(0.25)

    return Response(
        generate(),
        content_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=7860, debug=False)
