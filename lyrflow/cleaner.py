"""
cleaner.py — Clean raw lyrics from Genius into lyric lines.
"""

from __future__ import annotations

import re
import unicodedata

# Example markers: [Verse 1], [Chorus], (Rap)
MARKER_PATTERN = re.compile(r"^\s*(\[[^\]]+\]|\([^)]+\))\s*$")


def clean_raw_lyrics(raw: str) -> list[str]:
    """
    Clean raw lyrics string into a list of lyric lines.

    - Unicode normalize NFC
    - Remove only structural marker lines
    - Drop empty lines
    - Preserve punctuation-only lyric lines
    """
    if raw is None:
        return []

    cleaned: list[str] = []
    for line in raw.split("\n"):
        line = unicodedata.normalize("NFC", line)
        if MARKER_PATTERN.match(line):
            continue
        if line.strip() == "":
            continue
        cleaned.append(line.strip())
    return cleaned

