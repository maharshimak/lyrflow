"""
legacy_output_formatter.py

पुराने/flattened console paste को नए per-line JSON array format में बदलने के लिए।

इनपुट format (जैसा आपके paste में दिखा):
<combo-line>
<EMOTION><DIFF>/100
<combo-line>
<EMOTION><DIFF>/100
...

Output:
LyricLine-compatible objects (backend/frontend के लिए structure-ready)
"""

from __future__ import annotations

import json
import re
import sys
from typing import Any


_HANGUL_RE = re.compile(r"[\uAC00-\uD7A3]")
_JAPANESE_RE = re.compile(r"[\u3040-\u30FF\u4E00-\u9FFF]")

# Cursor/IDE में run करने के लिए default:
# यहां पर अपना पूरा legacy paste डालें।
RAW_TEXT = ""


def _collapse_spaces(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "")).strip()


def _normalize_translation(s: str) -> str:
    # Minimal deterministic cleanup for display
    out = _collapse_spaces(s)
    out = re.sub(r"\s+([,.;:!?])", r"\1", out)
    out = out.replace("？", "?").replace("！", "!")
    out = out.replace("’", "'")
    return _collapse_spaces(out)


def _emotion_from_token(token: str) -> str:
    t = (token or "").strip().upper()
    mapping = {
        "NEUTRAL": "neutral",
        "HYPE": "hype",
        "SAD": "sad",
        "AGGRESSIVE": "aggressive",
        "SOFT": "soft",
        "PLAYFUL": "playful",
        "LONGING": "longing",
        "EMPOWERING": "empowering",
    }
    return mapping.get(t, "neutral")


def _parse_emotion_and_difficulty(line: str) -> tuple[str, int] | None:
    s = (line or "").strip()
    if not s:
        return None

    # Examples:
    # NEUTRAL50/100
    # NEUTRAL 50/100
    m = re.search(r"^(?P<emo>[A-Z_]+)\s*(?P<diff>\d{1,3})\s*/\s*100\s*$", s)
    if not m:
        return None

    emo_token = m.group("emo")
    diff = int(m.group("diff"))
    diff = max(0, min(100, diff))
    return _emotion_from_token(emo_token), diff


def _detect_language(line: str) -> str:
    has_h = bool(_HANGUL_RE.search(line))
    has_j = bool(_JAPANESE_RE.search(line))
    if has_h and has_j:
        return "mixed_ko_ja"
    if has_h:
        return "ko"
    if has_j:
        return "ja"
    return "en"


def _split_combo(combo: str) -> tuple[str, str, str]:
    """
    Heuristic split:
    - line: non-latin (Hangul/Japanese) prefix (may be empty)
    - latin remainder split into romanized + translation using sentence boundary:
      first occurrence of [.!?] followed by optional space then a capital letter or '('
    """
    c = combo or ""
    c = c.strip()
    if not c:
        return "", "", ""

    latin_m = re.search(r"[A-Za-z]", c)
    if not latin_m:
        # No latin -> treat as original line only
        return c, c, c

    latin_start = latin_m.start()
    original = _collapse_spaces(c[:latin_start])
    remainder = c[latin_start:].strip()

    # Find a romanized->translation boundary in remainder:
    # punctuation ending romanized, then translation starting (capital or '(')
    boundary = re.search(r"([.!?？！。]+)\s*(?=[A-Z(])", remainder)
    if boundary:
        end_punct_idx = boundary.end(1)  # end of punctuation group
        romanized = remainder[:end_punct_idx].strip()
        translation = remainder[end_punct_idx:].lstrip()
        translation = _collapse_spaces(translation)
        romanized = _collapse_spaces(romanized)
        if not translation:
            translation = romanized
        return original, romanized, translation

    # Fallback: can't detect split, keep the whole remainder as romanized and translation
    romanized = remainder
    translation = remainder
    return original, _collapse_spaces(romanized), _normalize_translation(translation)


def _practice_priority(difficulty_score: int, emotion: str) -> str:
    diff = int(difficulty_score)
    e = (emotion or "neutral").lower()
    if diff >= 70 or e in ["aggressive", "longing", "empowering"]:
        return "high"
    if 40 <= diff <= 69:
        return "medium"
    if diff < 40 and e in ["neutral", "playful", "soft"]:
        return "low"
    return "medium"


def parse_legacy_output(raw_text: str) -> list[dict[str, Any]]:
    """
    legacy paste -> structured per-line objects.
    """
    lines = [ln.rstrip("\r\n") for ln in (raw_text or "").splitlines()]
    # remove empty spacer lines but keep order
    lines = [ln for ln in lines if ln.strip() != ""]

    out: list[dict[str, Any]] = []
    combo: str | None = None
    idx = 0

    for ln in lines:
        parsed = _parse_emotion_and_difficulty(ln)
        if parsed is not None:
            if combo is None:
                # If input starts with emotion/diff unexpectedly, just skip
                continue

            emotion, diff = parsed
            language = _detect_language(combo)
            line_part, romanized, translation = _split_combo(combo)

            # Ensure non-empty romanized/translation for schema safety
            romanized = romanized if romanized else _collapse_spaces(line_part) or _collapse_spaces(combo)
            translation = translation if translation else romanized

            out.append(
                {
                    "index": idx,
                    "line": line_part or combo,
                    "language": language,
                    "romanized": romanized,
                    "translation": _normalize_translation(translation),
                    "syllables": "",
                    "confidence": "low",
                    "emotion": emotion,
                    "difficulty_score": diff,
                    "practice_priority": _practice_priority(diff, emotion),
                    "phoneme_hints": "",
                    "phoneme_map": [],
                }
            )
            idx += 1
            combo = None
        else:
            # combo line
            if combo is None:
                combo = ln.strip()
            else:
                # rare: multiple lines before emotion/diff -> join with a space
                combo = f"{combo} {ln.strip()}"

    return out


def _main() -> None:
    # Usage:
    # 1) stdin pipe:  echo "..." | python legacy_output_formatter.py
    # 2) Or set RAW_TEXT in this file.
    raw_text = RAW_TEXT or ""

    if not sys.stdin.isatty():
        raw_text = sys.stdin.read()
    else:
        raw_text = (raw_text or "").strip()

    if not raw_text:
        # No input provided.
        print("Paste legacy text into stdin (preferred) or edit RAW_TEXT in this file.")
        return

    formatted = parse_legacy_output(raw_text)
    print(json.dumps(formatted, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    _main()

