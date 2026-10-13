"""
pipeline.py — Orchestrates Genius fetch → cleaning → GPT processing → schema + analytics.
"""

from __future__ import annotations

import logging
import re

from lyrflow import cleaner
from lyrflow import fetcher
from lyrflow import ai_processor
from lyrflow.romanizer import romanize_line
from lyrflow.translator import translate_line
from lyrflow.schema import (
    dominant_language,
    validate_line_object,
    compute_difficulty_score,
    detect_emotion,
    compute_practice_priority,
)
from lyrflow.analyzer import analyze_song
from collections import Counter

_log = logging.getLogger(__name__)

_LATIN_RE = re.compile(r"[A-Za-z]")
_HANGUL_RE = re.compile(r"[\uAC00-\uD7A3]")
_JAPANESE_RE = re.compile(r"[\u3040-\u30FF\u4E00-\u9FFF]")


def _update_progress(job_id: str, patch: dict) -> None:
    """
    Backward-compatible no-op.

    Some Flask job runners import this symbol to update job status.
    If a specific persistence layer isn't present, we safely ignore progress patches.
    """


def _collapse_spaces(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "")).strip()


def _cleanup_romanized_japanese(romanized: str) -> str:
    """
    Display-friendly cleanup for Hepburn romanization:
    - collapse accidental double spaces
    - normalize spacing around punctuation + parentheses + Japanese punctuation
    - preserve normal word spacing (we avoid splitting letters)
    """
    s = _collapse_spaces(romanized)
    if not s:
        return romanized

    # Normalize full-width punctuation spacing issues
    s = s.replace("（", "(").replace("）", ")")

    # Remove spaces before punctuation
    s = re.sub(r"\s+([,.;:!?？。])", r"\1", s)

    # Remove spaces just inside parentheses
    s = re.sub(r"\(\s+", "(", s)
    s = re.sub(r"\s+\)", ")", s)

    # Remove spaces before closing quote/bracket
    s = re.sub(r"\s+([\"'\]\}])", r"\1", s)

    # Normalize dashes/em-dashes spacing
    s = re.sub(r"\s+—\s*", " — ", s)
    s = re.sub(r"\s+--\s*", " -- ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _cleanup_translation_english(text: str) -> str:
    """
    Small, deterministic English cleanup:
    - collapse whitespace
    - remove spaces before punctuation
    - improve common contractions for musical flow
    """
    s = _collapse_spaces(text)
    if not s:
        return text

    s = re.sub(r"\s+([,.;:!?])", r"\1", s)
    s = s.replace("？", "?").replace("！", "!")

    # Contractions (safe, deterministic)
    s = re.sub(r"\bwhat is\b", "what's", s, flags=re.IGNORECASE)
    s = re.sub(r"\bwhat are\b", "what're", s, flags=re.IGNORECASE)
    s = re.sub(r"\bi am\b", "I'm", s, flags=re.IGNORECASE)
    s = re.sub(r"\bdo not\b", "don't", s, flags=re.IGNORECASE)
    s = re.sub(r"\bdoes not\b", "doesn't", s, flags=re.IGNORECASE)
    s = re.sub(r"\bdid not\b", "didn't", s, flags=re.IGNORECASE)
    s = re.sub(r"\bcan not\b", "can't", s, flags=re.IGNORECASE)
    s = re.sub(r"\bwill not\b", "won't", s, flags=re.IGNORECASE)

    # Gentle apostrophe cleanup (avoid "what’s" vs "what's" mixing)
    s = s.replace("’", "'")
    return _collapse_spaces(s)


def _cleanup_translation_french(text: str) -> str:
    """
    Small deterministic French-friendly cleanup:
    - collapse whitespace
    - remove spaces before punctuation
    - normalize full-width punctuation
    - avoid English contraction rewrites
    """
    s = _collapse_spaces(text)
    if not s:
        return text

    s = re.sub(r"\s+([,.;:!?])", r"\1", s)
    s = s.replace("？", "?").replace("！", "!")
    s = s.replace("’", "'")
    return _collapse_spaces(s)


def process_song(
    title: str,
    artist: str,
    genius_key: str,
    openai_key: str,
    job_id: str | None = None,
    translation_lang: str = "en",
) -> dict:
    # Ensure ai_processor uses provided key even if env wasn't configured.
    if openai_key:
        ai_processor.OPENAI_API_KEY = openai_key

    raw = fetcher.fetch_lyrics(title, artist, genius_key)
    if not raw:
        return {"title": title, "artist": artist, "error": "lyrics not found"}

    lines = cleaner.clean_raw_lyrics(raw)
    if not lines:
        return {"title": title, "artist": artist, "error": "no lyrics after cleaning"}

    # Repetition-aware optimization:
    # If the same cleaned lyric line repeats, we only send it once to the AI
    # and then copy the result back to all occurrences.
    counts = Counter(lines)
    line_to_unique_idx: dict[str, int] = {}
    unique_lines: list[str] = []
    for line in lines:
        if line not in line_to_unique_idx:
            line_to_unique_idx[line] = len(unique_lines)
            unique_lines.append(line)

    ai_results = ai_processor.process_lines_with_ai(
        unique_lines,
        title,
        artist,
        translation_lang=translation_lang,
    )

    # Map AI result back to full line list.
    lyrics_list: list[dict] = []
    for i, line in enumerate(lines):
        uidx = line_to_unique_idx.get(line, 0)
        obj = dict(ai_results[uidx]) if uidx < len(ai_results) else {}
        obj["index"] = i
        obj["line"] = line
        obj["is_repeated"] = counts.get(line, 0) > 1
        lyrics_list.append(obj)

    # Validate / normalize each line object.
    validated = [validate_line_object(obj, i, lines[i]) for i, obj in enumerate(lyrics_list)]

    # Validation layer: detect flat outputs and apply deterministic boost.
    difficulty_scores = [int(l.get("difficulty_score", 50)) for l in validated]
    emotions = [str(l.get("emotion", "neutral")) for l in validated]

    unique_diffs = {d for d in difficulty_scores}
    unique_emotions = {e for e in emotions}

    tier_flags = {
        "easy": any(d < 40 for d in difficulty_scores),
        "medium": any(40 <= d < 70 for d in difficulty_scores),
        "hard": any(d >= 70 for d in difficulty_scores),
    }

    flat_difficulty = len(unique_diffs) <= 1
    flat_emotion = len(unique_emotions) <= 1
    missing_tiers = not (tier_flags["easy"] and tier_flags["medium"] and tier_flags["hard"])
    too_flat = flat_difficulty or flat_emotion or missing_tiers

    neutral_ratio = (emotions.count("neutral") / len(emotions)) if emotions else 0.0
    difficulty_span = (max(difficulty_scores) - min(difficulty_scores)) if difficulty_scores else 0
    low_emotion_variety = len(unique_emotions) < 3

    need_normalize = bool(validated) and (
        too_flat
        or neutral_ratio >= 0.85
        or difficulty_span <= 5
        or low_emotion_variety
    )

    if need_normalize:
        # Deterministic re-scoring based purely on the input line content.
        # (No randomness; repeated lines remain consistent.)
        for obj in validated:
            line_text = str(obj.get("line", ""))

            new_emotion = detect_emotion(line_text)
            new_diff_raw = compute_difficulty_score(line_text)

            # Enforce perceived scale 20..90 for consistency in UI.
            new_diff = int(max(20, min(int(new_diff_raw), 90)))

            obj["emotion"] = new_emotion
            obj["difficulty_score"] = new_diff
            obj["practice_priority"] = compute_practice_priority(new_diff, new_emotion)
            obj["confidence"] = "low"

        # If still not enough emotion variety, force deterministic diversity by tier.
        emotions2 = [str(l.get("emotion", "neutral")) for l in validated]
        if len(set(emotions2)) < 3 and len(validated) >= 3:
            # Repeat-consistency: apply emotion forcing per unique line group.
            line_groups2: dict[str, list[dict]] = {}
            for obj in validated:
                line_key = str(obj.get("line", "") or "")
                line_groups2.setdefault(line_key, []).append(obj)

            keys2 = [k for k in line_groups2.keys() if k]
            if keys2:
                # Sort by representative difficulty (max in group), then by text for determinism.
                keys2_sorted = sorted(
                    keys2,
                    key=lambda k: (max(int(o.get("difficulty_score", 50)) for o in line_groups2.get(k, [])), k),
                )

                # lowest -> soft, middle -> longing, highest -> aggressive
                soft_key = keys2_sorted[0]
                longing_key = keys2_sorted[len(keys2_sorted) // 2]
                aggressive_key = keys2_sorted[-1]

                for o in line_groups2.get(soft_key, []):
                    o["emotion"] = "soft"
                for o in line_groups2.get(longing_key, []):
                    o["emotion"] = "longing"
                for o in line_groups2.get(aggressive_key, []):
                    o["emotion"] = "aggressive"
            for obj in validated:
                obj["practice_priority"] = compute_practice_priority(
                    int(obj.get("difficulty_score", 50)),
                    str(obj.get("emotion", "neutral")),
                )

        # Ensure at least one hard / medium / easy difficulty tier.
        # (Deterministic; keeps repeated lines consistent by applying per unique line text.)
        difficulty_scores2 = [int(l.get("difficulty_score", 50)) for l in validated]
        tier_flags2 = {
            "easy": any(d < 40 for d in difficulty_scores2),
            "medium": any(40 <= d < 70 for d in difficulty_scores2),
            "hard": any(d >= 70 for d in difficulty_scores2),
        }

        line_groups: dict[str, list[dict]] = {}
        for obj in validated:
            line_groups.setdefault(str(obj.get("line", "")), []).append(obj)

        def _pick_group_key(mode: str) -> str:
            keys = [k for k in line_groups.keys() if k]
            if not keys:
                return ""
            # Use deterministic heuristics per mode.
            if mode == "hard":
                return sorted(keys, key=lambda k: len(k), reverse=True)[0]
            if mode == "easy":
                return sorted(keys, key=lambda k: len(k))[0]
            return sorted(keys, key=lambda k: len(k))[len(keys) // 2]

        if not tier_flags2["hard"]:
            key = _pick_group_key("hard")
            for obj in line_groups.get(key, []):
                obj["difficulty_score"] = 80
                obj["emotion"] = "aggressive"
                obj["practice_priority"] = compute_practice_priority(80, "aggressive")
                obj["confidence"] = "low"

        if not tier_flags2["medium"]:
            key = _pick_group_key("medium")
            for obj in line_groups.get(key, []):
                obj["difficulty_score"] = 55
                obj["emotion"] = detect_emotion(str(obj.get("line", "")))
                obj["practice_priority"] = compute_practice_priority(
                    int(obj["difficulty_score"]), str(obj["emotion"])
                )
                obj["confidence"] = "low"

        if not tier_flags2["easy"]:
            key = _pick_group_key("easy")
            for obj in line_groups.get(key, []):
                obj["difficulty_score"] = 25
                obj["emotion"] = detect_emotion(str(obj.get("line", "")))
                obj["practice_priority"] = compute_practice_priority(
                    int(obj["difficulty_score"]), str(obj["emotion"])
                )
                obj["confidence"] = "low"

    # Deterministic display cleanup (Romanized Japanese spacing + translation tone).
    for obj in validated:
        lang = str(obj.get("language", "en") or "en")
        romanized = obj.get("romanized", "")
        translation = obj.get("translation", "")
        line_text = str(obj.get("line", "") or "")

        if "ja" in lang:
            obj["romanized"] = _cleanup_romanized_japanese(str(romanized))

        # Universal romanization safety net:
        # If AI returned romanized==original for non-Latin lines, force a local best-effort romanization.
        # This improves support for "all languages" beyond ko/ja/en.
        has_latin = bool(_LATIN_RE.search(line_text))
        romanized_text = str(obj.get("romanized", "") or "")
        if romanized_text.strip() == line_text.strip() and line_text and not has_latin:
            if _HANGUL_RE.search(line_text):
                obj["romanized"] = romanize_line(line_text, "ko")
            elif _JAPANESE_RE.search(line_text):
                obj["romanized"] = romanize_line(line_text, "ja")
            else:
                obj["romanized"] = romanize_line(line_text, "en")

        # If romanization still appears non-Latin (e.g., some Indic scripts with weak transliteration),
        # provide a readable Latin fallback so UI always shows usable coaching text under each line.
        romanized_now = str(obj.get("romanized", "") or "")
        if romanized_now and not _LATIN_RE.search(romanized_now):
            proxy = translate_line(line_text, lang, target_lang="en")
            if proxy and _LATIN_RE.search(proxy):
                obj["romanized"] = proxy

        # Universal translation safety net:
        # If translation is missing/unavailable or the model just echoed the original,
        # run deterministic fallback translation for a better “coach paragraph” experience.
        translation_val = str(obj.get("translation", "") or "")
        needs_translation = (
            translation_val.strip() == ""
            or translation_val == "[translation unavailable]"
            or (translation_val.strip() == line_text.strip() and not _LATIN_RE.search(line_text))
        )
        if needs_translation:
            src_lang = lang
            filled = translate_line(line_text, src_lang, target_lang=str(translation_lang))
            if not filled or filled == line_text:
                filled = "[translation unavailable]"
            obj["translation"] = filled

        # Keep translation readable (punctuation spacing).
        if str(translation_lang).strip().lower() == "fr":
            obj["translation"] = _cleanup_translation_french(str(translation))
        else:
            obj["translation"] = _cleanup_translation_english(str(translation))

        # Keep line_energy aligned after any deterministic normalization.
        line = str(obj.get("line", "") or "")
        emotion = str(obj.get("emotion", "neutral") or "neutral").lower()
        is_repeated = bool(obj.get("is_repeated"))
        has_strong_punct = any(p in line for p in ["!", "?", "..."])
        if emotion in ["hype", "aggressive", "empowering"] or has_strong_punct or is_repeated:
            obj["line_energy"] = "high"
        elif emotion in ["longing", "sad"]:
            obj["line_energy"] = "medium"
        else:
            obj["line_energy"] = "low"

    result = {
        "title": title,
        "artist": artist,
        "language": dominant_language(validated),
        "total_lines": len(validated),
        "lyrics": validated,
        "translation_lang": str(translation_lang).strip().lower(),
    }
    return analyze_song(result)

