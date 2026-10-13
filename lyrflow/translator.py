"""
translator.py — English translation fallback (only used when GPT/AI processing fails).
"""

from __future__ import annotations

import logging
import time
import re

class GoogleTranslator:
    """Compatibility seam: insecure unofficial scraping fallback is disabled.

    AI translation remains available through the existing server-side provider.
    Tests may substitute this seam without network access.
    """
    def __init__(self, source: str, target: str) -> None:
        self.source = source
        self.target = target

    def translate(self, line: str) -> str:
        import os
        if os.environ.get("LYRFLOW_ENABLE_UNOFFICIAL_TRANSLATION") != "1":
            raise RuntimeError("Unofficial translation fallback disabled")
        from deep_translator import GoogleTranslator as OptionalTranslator
        return OptionalTranslator(source=self.source, target=self.target).translate(line)

from lyrflow.config import TRANSLATION_SLEEP

_log = logging.getLogger(__name__)

_TRANSLATE_CACHE: dict[tuple[str, str, str], str] = {}

_HANGUL_RE = re.compile(r"[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]")
_JAPANESE_RE = re.compile(r"[\u3040-\u30FF\u4E00-\u9FFF]")
_LATIN_RE = re.compile(r"[A-Za-z]")

LANG_MAP = {
    "ko": "ko",
    "ja": "ja",
    "en": "en",
    "mixed_ko": "ko",
    "mixed_ja": "ja",
    "mixed_ko_ja": "auto",
}


def _is_symbol_or_filler_line(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return True
    # Treat as filler only when the line has no alphabetic letters at all.
    # This allows Punjabi/Gurmukhi/Arabic/etc. to be translated even though
    # they are not in our KO/JA/LATIN script ranges.
    has_alpha = any(ch.isalpha() for ch in stripped)
    if not has_alpha:
        return True
    return False


def translate_line(line: str, source_lang: str, target_lang: str = "en") -> str:
    """
    Translate a single lyric line.

    - For English source + English target, we keep it unchanged when it already looks Latin.
    - For other cases (including when source_lang is "en" but the line is non-Latin),
      we translate using GoogleTranslator with source="auto".
    """
    line = line or ""
    target_lang = (target_lang or "en").strip().lower()
    if _is_symbol_or_filler_line(line):
        return line
    if not line.strip():
        return line

    cache_key = (line, source_lang, target_lang)
    if cache_key in _TRANSLATE_CACHE:
        return _TRANSLATE_CACHE[cache_key]

    # If the song line is already Latin and user wants English, keep it unchanged.
    # For non-Latin scripts (even if detected as "en"), we translate from auto.
    if source_lang == "en" and target_lang == "en":
        has_latin = bool(_LATIN_RE.search(line))
        if has_latin:
            _TRANSLATE_CACHE[cache_key] = line
            return line

    # If target isn't English (e.g. French), we translate even if the source is "en".
    # Also handle "source_lang=='en'" but non-latin scripts by translating from auto.

    try:
        src = LANG_MAP.get(source_lang, "auto")
        # When source is "en" but the line isn't Latin, we must translate from auto.
        if source_lang == "en":
            has_latin = bool(_LATIN_RE.search(line))
            if not has_latin:
                src = "auto"
            # target != en is also safe to translate from whatever src is.
            # (src will be auto for non-latin as above)

        translated = GoogleTranslator(source=src, target=target_lang).translate(line)
        time.sleep(TRANSLATION_SLEEP)
        out = translated if translated else "[translation unavailable]"
        _TRANSLATE_CACHE[cache_key] = out
        return out
    except Exception as e:
        _log.warning("Translation fallback failed: %s", e)
        out = "[translation unavailable]"
        _TRANSLATE_CACHE[cache_key] = out
        return out

