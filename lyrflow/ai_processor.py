"""
ai_processor.py — Primary GPT-4o processing for per-line language + romanization + translation + coaching metadata.

This module implements:
- Retry with exponential backoff + jitter
- Chunking for long songs (offset-aware indexing)
- Partial output recovery on JSON length mismatches
- Strict JSON parsing with robust fallbacks
"""

from __future__ import annotations

import json
import logging
import os
import hashlib
import random
import re
import time
from typing import Any

from openai import OpenAI

from lyrflow.config import (
    OPENAI_API_KEY,
    OPENAI_MODEL,
    OPENAI_MAX_TOKENS,
    RATE_LIMIT_SLEEP,
    TRANSLATION_SLEEP,  # not used here but keep config import parity
    CHUNK_SIZE,
)
from lyrflow.schema import validate_line_object
from lyrflow.detector import detect_line_language
from lyrflow.romanizer import romanize_line
from lyrflow.translator import translate_line
from lyrflow.syllables import syllables_for_line
from lyrflow.schema import compute_difficulty_score, detect_emotion, compute_practice_priority

_log = logging.getLogger(__name__)

_AI_CHUNK_CACHE_DIR = os.path.join("lyrflow", "cache", "ai_chunks")


def _chunk_cache_path(
    title: str,
    artist: str,
    offset: int,
    translation_lang: str,
    lines: list[str],
) -> str:
    key = f"{title}||{artist}||{offset}||{translation_lang}||" + "\n".join(lines)
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()
    return os.path.join(_AI_CHUNK_CACHE_DIR, f"{digest}.json")


SYSTEM_PROMPT = """
You are a vocal-coach linguistic engine for Mak Ai (K-pop/J-pop vocal training).

Return ONLY a raw JSON array. No markdown. No explanation. No extra text.

========================
STRUCTURE RULES
========================
Each input line must produce exactly one object.
Index must match input order exactly (0-based, sequential).
Never skip lines.
Never return empty romanized or translation fields.

Each object MUST include EXACT KEYS (14):
index, line, language, romanized, translation, syllables, confidence, emotion,
difficulty_score, practice_priority, phoneme_hints, phoneme_map, vocal_arc, breath_coach

========================
LANGUAGE RULES
========================
Allowed language values:
ko, ja, en, mixed_ko, mixed_ja, mixed_ko_ja

Detect each line carefully.

For Japanese (ja):
- Use Hepburn-style romanization.
- Keep output readable and singer-friendly.
- Do NOT insert random broken spacing.
- Do NOT over-separate syllables inside normal romanized words.
- Punctuation should remain natural.

For Korean (ko):
- Use Revised Romanization.
- Keep mixed English tokens unchanged.

For English (en):
- Keep Latin text unchanged.
- If the input contains non-Latin scripts, produce a best-effort Latin transliteration in `romanized` (no random broken spacing).

For mixed lines:
- romanize only non-Latin spans.
- preserve English exactly.

========================
TRANSLATION RULES
========================
Translation must be:
- natural {TARGET_LANG_NAME}
- concise
- emotionally aware
- readable in a vocal-coach UI
- not robotic
- not overly literal if literal wording sounds unnatural

Rules:
- max about 12 words when possible
- filler lines remain unchanged
- chant-like lines can remain chant-like
- musical energy must be preserved

NEVER output empty translation.

========================
EMOTION RULES
========================
Allowed emotion values only:
hype, sad, aggressive, soft, playful, longing, empowering, neutral

Do NOT assign the same emotion to nearly every line.
Emotion must be inferred from:
- line energy
- repetition intensity
- emotional tone
- chant quality
- lyrical meaning
- delivery style

MOOD ARC DETECTION:
Pay attention to emotional transitions between consecutive lines.
If a line shifts the mood (e.g., from longing to aggressive, or hype to soft),
that transition line should accurately reflect the new mood, not the previous one.
This creates a realistic emotional arc across the song.

SONG-LEVEL DISTRIBUTION:
At least 3 distinct emotion values must appear when the lyrics support it.

========================
DIFFICULTY RULES
========================
difficulty_score must be an integer from 0 to 100.
It MUST vary meaningfully across lines.
Do NOT output 50 for everything.

Use these factors:
1) pronunciation complexity
2) line length
3) speed / repetition density
4) mixed-script complexity
5) hard consonants / dense phonetic sequences
6) chant intensity / breath control demands
7) emotional delivery difficulty

Calibration examples (Korean):
- "괜찮아" (gwaenchanh-a) → batchim cluster nh → +15 difficulty
- "꿈" (kkum) → tense initial consonant → +10 difficulty
- "라라라" (la la la) → easy open syllables → difficulty ~22

Suggested scale:
0–20 very easy
21–40 easy
41–60 medium
61–80 hard
81–100 expert

SONG-LEVEL DISTRIBUTION:
Include some easy lines (<40), some medium lines (40–69), and some hard lines (70+), when lyrics support it.

========================
PRACTICE PRIORITY RULES
========================
Allowed values: low, medium, high

high => difficulty >= 70 OR emotionally demanding lines
medium => difficulty 40–69
low => difficulty < 40 and simple delivery

========================
CONSISTENCY RULE
========================
If the exact same lyric line appears multiple times in the song,
its emotion, romanized text, translation, and difficulty_score must remain consistent.
Do NOT randomly vary repeated lines.

========================
SYLLABLE RULES
========================
For Korean:
- hyphen-separated vocal chunks
For Japanese:
- readable singer-friendly mora grouping
- keep it clean and practical
For English:
- empty string is acceptable

For mixed lines:
- syllabify only non-Latin romanized parts; preserve Latin tokens as-is.

========================
SELF-CHECK
========================
Before returning output, internally verify:
- every object has all required keys
- romanized != "" for every object
- translation != "" for every object
- not all emotions are identical
- not all difficulty_score values are identical

Finally: return ONLY the JSON array.
"""


def _fallback_objects(
    lines: list[str],
    offset: int = 0,
    translation_lang: str = "en",
) -> list[dict]:
    _hangul_re = re.compile(r"[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]")
    _japanese_re = re.compile(r"[\u3040-\u30FF\u4E00-\u9FFF]")
    _latin_re = re.compile(r"[A-Za-z]")

    def _is_symbol_or_filler_only(s: str) -> bool:
        stripped = s.strip()
        if not stripped:
            return True
        has_h = bool(_hangul_re.search(s))
        has_j = bool(_japanese_re.search(s))
        has_l = bool(_latin_re.search(s))
        # If there's no script letters at all, treat as filler/symbol-only.
        return not (has_h or has_j or has_l)

    results: list[dict] = []
    for i, line in enumerate(lines):
        lang = detect_line_language(line)
        romanized = romanize_line(line, lang) or line
        translation = translate_line(line, lang, target_lang=translation_lang) or "[translation unavailable]"
        syllables = syllables_for_line(line, lang) if lang != "en" else ""

        stripped = line.strip()
        confidence = "high"
        if translation == "[translation unavailable]":
            confidence = "low"
        elif len(stripped) <= 2:
            confidence = "low"
        elif _is_symbol_or_filler_only(line):
            confidence = "low"

        emotion = detect_emotion(line)
        difficulty_score = compute_difficulty_score(line)
        practice_priority = compute_practice_priority(difficulty_score, emotion)
        obj = {
            "index": i + offset,
            "line": line,
            "language": lang,
            "romanized": romanized,
            "translation": translation,
            "syllables": syllables,
            "confidence": confidence,
            "emotion": emotion,
            "difficulty_score": difficulty_score,
            "practice_priority": practice_priority,
            "phoneme_hints": "",
            "phoneme_map": [],
        }
        # Ensure all REQUIRED_KEYS exist (schema may require additional coaching fields).
        results.append(validate_line_object(obj, obj["index"], line))

    return results


def _call_openai_with_retry(
    client: OpenAI,
    model: str,
    max_tokens: int,
    messages: list[dict[str, str]],
    max_retries: int = 3,
) -> str:
    delays = [1, 2, 4]
    last_err: Exception | None = None

    # We intentionally do NOT force response_format here to avoid models
    # returning a wrapped object instead of a raw JSON array.

    for attempt, base_delay in enumerate(delays[:max_retries], 1):
        try:
            response = client.chat.completions.create(
                model=model,
                max_tokens=max_tokens,
                messages=messages,
                timeout=30,
            )
            return response.choices[0].message.content or "[]"
        except Exception as e:  # Retry broadly; never crash the pipeline.
            last_err = e
            jitter = random.uniform(0, 1)
            wait = base_delay + jitter
            _log.warning("OpenAI attempt %d failed: %s. Retrying in %.1fs...", attempt, e, wait)
            time.sleep(wait)

    raise RuntimeError(f"OpenAI API failed after retries: {last_err}")


def _parse_ai_response(
    content: str,
    lines: list[str],
    offset: int = 0,
    translation_lang: str = "en",
) -> list[dict]:
    try:
        content = content or ""
        content = re.sub(r"^```(?:json)?\n?", "", content.strip())
        content = re.sub(r"\n?```$", "", content.strip())
        raw: Any
        try:
            raw = json.loads(content)
        except Exception:
            # Best-effort extraction of the first JSON array.
            match = re.search(r"\[.*\]", content, flags=re.DOTALL)
            if not match:
                raise
            raw = json.loads(match.group(0))

        # Handle wrapper objects when GPT ignores array instruction.
        if isinstance(raw, dict):
            for key in ("lyrics", "lines", "data", "result", "output", "items", "objects"):
                if key in raw and isinstance(raw[key], list):
                    raw = raw[key]
                    break

        if isinstance(raw, list) and len(raw) == len(lines):
            # Enforce offset index correction.
            normalized: list[dict] = []
            for i, obj in enumerate(raw):
                if isinstance(obj, dict):
                    obj = obj.copy()
                    if "index" not in obj:
                        obj["index"] = i + offset
                    else:
                        obj["index"] = int(obj.get("index", i)) + offset
                    normalized.append(validate_line_object(obj, obj["index"], lines[i]))
                else:
                    normalized.append(
                        validate_line_object(
                            _fallback_objects(
                                [lines[i]],
                                offset=i + offset,
                                translation_lang=translation_lang,
                            )[0],
                            i + offset,
                            lines[i],
                        )
                    )
            return normalized

        # Length mismatch recovery: attempt to map objects by their indices.
        if not isinstance(raw, list):
            _log.warning("AI response not a list — using fallback.")
            return _fallback_objects(lines, offset=offset, translation_lang=translation_lang)

        _log.warning(
            "Length mismatch: got %d, expected %d. Attempting recovery.",
            len(raw),
            len(lines),
        )

        indexed: dict[int, dict] = {}
        for obj in raw:
            if isinstance(obj, dict):
                idx = obj.get("index", -1)
                if isinstance(idx, int):
                    indexed[idx] = obj

        recovered: list[dict] = []
        for i, line in enumerate(lines):
            global_i = i + offset
            if global_i in indexed:
                recovered.append(validate_line_object(indexed[global_i], global_i, line))
            elif i in indexed:
                obj = indexed[i].copy()
                obj["index"] = global_i
                recovered.append(validate_line_object(obj, global_i, line))
            else:
                recovered.append(
                    validate_line_object(
                        _fallback_objects([line], offset=global_i, translation_lang=translation_lang)[0],
                        global_i,
                        line,
                    )
                )
        return recovered
    except Exception as e:
        _log.warning("AI JSON parse failed: %s. Using fallback.", e)
        return _fallback_objects(lines, offset=offset, translation_lang=translation_lang)

def _process_chunk(
    lines: list[str],
    title: str,
    artist: str,
    offset: int,
    translation_lang: str = "en",
) -> list[dict]:
    os.makedirs(_AI_CHUNK_CACHE_DIR, exist_ok=True)
    cache_path = _chunk_cache_path(title, artist, offset, translation_lang, lines)
    # Chunk cache: avoids repeated OpenAI calls for the same song chunk.
    try:
        if os.path.exists(cache_path):
            with open(cache_path, "r", encoding="utf-8") as f:
                cached = json.load(f)
            if isinstance(cached, list) and len(cached) == len(lines):
                normalized: list[dict] = []
                for i, obj in enumerate(cached):
                    if isinstance(obj, dict):
                        obj2 = obj.copy()
                        obj2["index"] = offset + i
                        normalized.append(validate_line_object(obj2, offset + i, lines[i]))
                    else:
                        normalized.append(
                            validate_line_object(
                                _fallback_objects([lines[i]], offset=offset + i, translation_lang=translation_lang)[0],
                                offset + i,
                                lines[i],
                            )
                        )
                return normalized
    except Exception:
        # Cache is optional; never block live processing.
        pass

    numbered = "\n".join(f"{i}: {line}" for i, line in enumerate(lines))
    user_message = f"Song: {title} by {artist}\nProcess {len(lines)} lines:\n\n{numbered}"

    if not OPENAI_API_KEY:
        _log.warning("OPENAI_API_KEY missing; using fallback for chunk offset=%d", offset)
        return _fallback_objects(lines, offset=offset, translation_lang=translation_lang)

    client = OpenAI(api_key=OPENAI_API_KEY)

    try:
        content = _call_openai_with_retry(
            client=client,
            model=OPENAI_MODEL,
            max_tokens=OPENAI_MAX_TOKENS,
            messages=[
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT.replace(
                        "{TARGET_LANG_NAME}",
                        "English" if str(translation_lang).strip().lower() == "en" else "French",
                    ),
                },
                {"role": "user", "content": user_message},
            ],
        )
        parsed = _parse_ai_response(content, lines, offset=offset, translation_lang=translation_lang)
        # Write cache (best-effort).
        try:
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump(parsed, f, ensure_ascii=False)
        except Exception:
            pass
        return parsed
    except Exception as e:
        _log.warning("Chunk failed for '%s' offset %d: %s", title, offset, e)
        return _fallback_objects(lines, offset=offset, translation_lang=translation_lang)


def process_lines_with_ai(
    lines: list[str],
    title: str,
    artist: str,
    translation_lang: str = "en",
) -> list[dict]:
    """
    Process lyric lines using GPT-4o.
    For long songs, chunk into CHUNK_SIZE and stitch results with global indices.
    """
    if not lines:
        return []

    if len(lines) <= CHUNK_SIZE:
        return _process_chunk(lines, title, artist, offset=0, translation_lang=translation_lang)

    results: list[dict] = []
    for i in range(0, len(lines), CHUNK_SIZE):
        chunk = lines[i : i + CHUNK_SIZE]
        chunk_results = _process_chunk(
            chunk,
            title,
            artist,
            offset=i,
            translation_lang=translation_lang,
        )
        results.extend(chunk_results)
        time.sleep(RATE_LIMIT_SLEEP)
    return results

