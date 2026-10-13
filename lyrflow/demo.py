"""
demo.py — Mak Ai Hackathon Demo Runner.
"""

from __future__ import annotations

import json
import logging
import io
import sys
from typing import Any

from lyrflow.config import GENIUS_API_KEY, OPENAI_API_KEY
from lyrflow.pipeline import process_song
from lyrflow.reporter import generate_report

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

DEMO_SONG = {"title": "Hype Boy", "artist": "NewJeans"}
FAKE_SONG = {"title": "Fake Song XYZ 99999", "artist": "Nobody123"}


def _ensure_utf8_output() -> None:
    """
    Windows consoles अक्सर default encoding cp1252 रखते हैं।
    Unicode (emoji/कोरियन टेक्स्ट) प्रिंट करने पर crash हो सकता है,
    इसलिए stdout/stderr को UTF-8 पर reconfigure करने की कोशिश करते हैं।
    """
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
        else:
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    except Exception:
        # Fallback: अगर console reconfigure नहीं हो पाता, तो डेमो फिर भी चलने की कोशिश करेगा।
        pass

    try:
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    except Exception:
        pass


def run_demo() -> None:
    _ensure_utf8_output()
    print("\n" + "=" * 62)
    print("  MAK AI — Mak Ai x Aivancity Hackathon 2026")
    print("=" * 62 + "\n")

    print(f"⏳ Processing: {DEMO_SONG['title']} — {DEMO_SONG['artist']}\n")
    result = process_song(DEMO_SONG["title"], DEMO_SONG["artist"], GENIUS_API_KEY, OPENAI_API_KEY)

    if "error" in result:
        print("⚠️  Could not fetch/compute real output.")
        print(f"   Error: {result.get('error')}\n")
    else:
        # PPT-aligned preview: show the core output schema
        preview = {
            "title": result.get("title"),
            "artist": result.get("artist"),
            "language": result.get("language"),
            "lyrics": [],
        }
        for obj in result.get("lyrics", [])[:6]:
            preview["lyrics"].append(
                {
                    "line": obj.get("line", ""),
                    "romanized": obj.get("romanized", ""),
                    "translation": obj.get("translation", ""),
                    "syllables": obj.get("syllables", ""),
                    "confidence": obj.get("confidence", ""),
                }
            )

        print("✨ LYRFLOW OUTPUT (PPT core schema preview):\n")
        print(json.dumps(preview, ensure_ascii=False, indent=2))

        # Also show mixed-language + syllables quick highlight for demo.
        mixed = [l for l in result.get("lyrics", []) if str(l.get("language", "")).startswith("mixed")]
        if mixed:
            m = mixed[0]
            print("\n🔎 Mixed-script highlight:")
            print(f"   Input     : {m.get('line')}")
            print(f"   Romanized : {m.get('romanized')}")
            print(f"   Syllables : {m.get('syllables')}")

        # Repetition-aware optimization (PPT-aligned wow moment)
        rep_count = result.get("repeated_lines_count", 0)
        if rep_count:
            print("\n🔁 Repetition focus:")
            print(f"   Detected repeated lines in this song: {rep_count}")

    print(generate_report(result))

    # Error handling demo
    print("\n⚠️  TESTING GRACEFUL ERROR HANDLING:")
    print(f"   Processing fake song: \"{FAKE_SONG['title']}\"")
    error_result = process_song(
        FAKE_SONG["title"], FAKE_SONG["artist"], GENIUS_API_KEY, OPENAI_API_KEY
    )
    print("   Result:", json.dumps(error_result, ensure_ascii=False))
    print("   ✓ Pipeline did not crash.\n")


if __name__ == "__main__":
    run_demo()

