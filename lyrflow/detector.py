"""
detector.py — per-line language detection using Unicode script ranges.
"""

from __future__ import annotations

import re

_HANGUL_RE = re.compile(r"[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]")
_KANA_RE = re.compile(r"[\u3040-\u30FF]")  # Hiragana + Katakana
_KANJI_RE = re.compile(r"[\u4E00-\u9FFF]")  # CJK ideographs
_LATIN_RE = re.compile(r"[A-Za-z]")


def detect_line_language(line: str) -> str:
    """
    Detect language of a single lyric line.

    Returns one of:
    - "ko"
    - "ja"
    - "en"
    - "mixed_ko"
    - "mixed_ja"
    - "mixed_ko_ja"
    """
    has_hangul = bool(_HANGUL_RE.search(line))
    # Japanese should be recognized primarily by kana presence.
    # This prevents Chinese-only kanji from being misclassified as "ja".
    has_kana = bool(_KANA_RE.search(line))
    has_kanji = bool(_KANJI_RE.search(line))
    has_japanese = has_kana or (has_kanji and has_kana)
    has_latin = bool(_LATIN_RE.search(line))

    if has_hangul and has_japanese:
        return "mixed_ko_ja"
    if has_hangul and has_latin:
        return "mixed_ko"
    if has_japanese and has_latin:
        return "mixed_ja"
    if has_hangul:
        return "ko"
    if has_japanese:
        return "ja"
    return "en"

