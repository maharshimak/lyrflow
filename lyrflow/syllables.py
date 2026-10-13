"""
syllables.py — syllable/mora segmentation helpers (fallback + bonus fields).
"""

from __future__ import annotations

import re

from hangul_romanize import Transliter
from hangul_romanize.rule import academic
import pykakasi

_transliter = Transliter(academic)
_kks = pykakasi.kakasi()

_KOREAN_CHAR_RE = re.compile(r"[\uAC00-\uD7A3]")
_JAPANESE_RE = re.compile(r"[\u3040-\u30FF\u4E00-\u9FFF]")


def syllables_korean_from_hangul(hangul_text: str) -> str:
    chars = [ch for ch in hangul_text if _KOREAN_CHAR_RE.match(ch)]
    if not chars:
        return ""
    syls: list[str] = []
    for ch in chars:
        try:
            syls.append(_transliter.translit(ch))
        except Exception:
            syls.append(ch)
    # Hyphen-separated romanized syllable blocks
    return "-".join(syls)


def syllables_japanese(text: str) -> str:
    if not _JAPANESE_RE.search(text):
        return ""
    try:
        result = _kks.convert(text)
        parts = [item.get("hepburn") for item in result if item.get("hepburn")]
        return "-".join(parts) if parts else ""
    except Exception:
        return ""


def syllables_for_line(line: str, lang: str) -> str:
    if lang == "en":
        return ""
    tokens = line.split()
    out_parts: list[str] = []
    for token in tokens:
        if _KOREAN_CHAR_RE.search(token):
            out_parts.append(syllables_korean_from_hangul(token))
        elif _JAPANESE_RE.search(token):
            out_parts.append(syllables_japanese(token))
        else:
            out_parts.append(token)

    result = " ".join([p for p in out_parts if p is not None and p != ""]).strip()
    return result

