"""
lyrflow/main.py — CLI entry point.

Usage:
  python -m lyrflow.main --process-all
  python -m lyrflow.main --title "No More Dream" --artist "BTS"
  python -m lyrflow.main --demo
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import shutil

from lyrflow.config import SONG_LIST
from lyrflow.pipeline import process_song

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
_log = logging.getLogger(__name__)


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")


def save_song(result: dict) -> None:
    os.makedirs("lyrflow/output", exist_ok=True)
    artist_slug = slugify(result.get("artist", "unknown"))
    title_slug = slugify(result.get("title", "unknown"))
    path = f"lyrflow/output/{artist_slug}_{title_slug}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    _log.info("  ✓ Saved: %s", path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Mak Ai Lyrics Pipeline")
    parser.add_argument("--process-all", action="store_true")
    parser.add_argument("--title", type=str)
    parser.add_argument("--artist", type=str)

    parser.add_argument("--report", action="store_true", help="Print practice report after processing")
    parser.add_argument("--cache-clear", action="store_true", help="Delete cached lyrics and reprocess")
    parser.add_argument("--show-hard", action="store_true", help="Print only lines with difficulty>=70")
    parser.add_argument("--demo", action="store_true", help="Run hackathon demo mode")

    args = parser.parse_args()

    if args.demo:
        from lyrflow.demo import run_demo

        run_demo()
        return

    if args.cache_clear:
        if os.path.exists("lyrflow/cache"):
            shutil.rmtree("lyrflow/cache")
            _log.info("Cache cleared.")

    # Import late to avoid env var errors on unit tests.
    from lyrflow.config import GENIUS_API_KEY, OPENAI_API_KEY

    if args.process_all:
        for song in SONG_LIST:
            result = process_song(song["title"], song["artist"], GENIUS_API_KEY, OPENAI_API_KEY)
            save_song(result)
        _log.info("Done. %d songs processed.", len(SONG_LIST))
        return

    if args.title and args.artist:
        result = process_song(args.title, args.artist, GENIUS_API_KEY, OPENAI_API_KEY)
        save_song(result)

        if args.report:
            from lyrflow.reporter import generate_report

            print(generate_report(result))

        if args.show_hard:
            hard_lines = [
                l for l in result.get("lyrics", []) if int(l.get("difficulty_score", 0)) >= 70
            ]
            print(json.dumps(hard_lines, ensure_ascii=False, indent=2))
        return

    parser.print_help()


if __name__ == "__main__":
    main()

