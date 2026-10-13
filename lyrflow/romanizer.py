"""
romanizer.py — local romanization fallbacks (Korean Revised + Japanese Hepburn).
GPT-4o is the primary engine; these are ONLY fallbacks and for syllable hints.
"""

from __future__ import annotations

import logging
import re

try:
    from unidecode import unidecode  # type: ignore
except Exception:  # pragma: no cover
    unidecode = None  # type: ignore[assignment]

try:
    from pypinyin import lazy_pinyin, Style  # type: ignore
except Exception:  # pragma: no cover
    lazy_pinyin = None  # type: ignore[assignment]
    Style = None  # type: ignore[assignment]

from hangul_romanize import Transliter
from hangul_romanize.rule import academic
import pykakasi

_log = logging.getLogger(__name__)

_transliter = Transliter(academic)
_kks = pykakasi.kakasi()

_KOREAN_RE = re.compile(r"[\uAC00-\uD7A3]")
_JAPANESE_RE = re.compile(r"[\u3040-\u30FF\u4E00-\u9FFF]")
_HANZI_RE = re.compile(r"[\u4E00-\u9FFF]")


def romanize_korean(text: str) -> str:
    try:
        # Token-level to avoid hard failures on odd whitespace/punctuation.
        tokens = text.split()
        if not tokens:
            return text
        return " ".join(_transliter.translit(t) for t in tokens)
    except Exception as e:
        _log.warning("Korean romanization failed: %s", e)
        return text


def romanize_japanese(text: str) -> str:
    try:
        result = _kks.convert(text)
        hepburn = [item.get("hepburn") for item in result if item.get("hepburn")]
        # Join without extra spaces to avoid over-separating mora clusters inside a word token.
        # We still keep the romanize_line() token boundaries controlled by the input whitespace.
        return "".join(hepburn).strip() if hepburn else text
    except Exception as e:
        _log.warning("Japanese romanization failed: %s", e)
        return text


def romanize_line(line: str, lang: str) -> str:
    """
    - en -> unchanged
    - ko -> romanize Korean tokens
    - ja -> romanize Japanese tokens
    - mixed variants -> romanize only non-Latin tokens, preserve Latin tokens
    """
    if lang == "en":
        # Best-effort UI romanization for any script:
        # - Hanzi -> pinyin (if available)
        # - other non-latin -> unidecode (if available)
        # - already-latin tokens remain unchanged
        tokens = (line or "").split()
        if not tokens:
            return line

        out: list[str] = []
        for token in tokens:
            if _HANZI_RE.search(token) and lazy_pinyin and Style:
                out.append("".join(lazy_pinyin(token, style=Style.TONELESS)).strip())
            elif unidecode and not re.search(r"[A-Za-z]", token or ""):
                out.append(unidecode(token).strip() or token)
            else:
                out.append(token)

        romanized = " ".join(out).strip()
        return romanized if romanized else line

    # Simple whitespace tokenization; punctuation is preserved as part of token.
    tokens = line.split()
    if not tokens:
        return line

    out: list[str] = []
    for token in tokens:
        if _KOREAN_RE.search(token):
            out.append(romanize_korean(token))
        elif _JAPANESE_RE.search(token):
            out.append(romanize_japanese(token))
        else:
            # Best-effort for other scripts inside mixed lines.
            if _HANZI_RE.search(token) and lazy_pinyin and Style:
                out.append("".join(lazy_pinyin(token, style=Style.TONELESS)).strip())
            elif unidecode and not re.search(r"[A-Za-z]", token or ""):
                out.append(unidecode(token).strip() or token)
            else:
                out.append(token)

    romanized = " ".join(out).strip()
    return romanized if romanized else line

