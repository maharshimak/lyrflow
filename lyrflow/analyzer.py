"""
analyzer.py — Song-level analytics from processed per-line data.
"""

from __future__ import annotations

from collections import Counter
from lyrflow.schema import _compute_vocal_arc, _compute_breath_coach, compute_practice_priority


def analyze_song(song: dict) -> dict:
    lyrics = song.get("lyrics", [])
    if not lyrics:
        return song

    enriched = dict(song)

    # ── Difficulty + singability ─────────────────────────────────────────────
    scores = [int(l.get("difficulty_score", 50)) for l in lyrics]
    avg = round(sum(scores) / len(scores), 1) if scores else 50.0
    enriched["avg_difficulty"] = avg
    enriched["singability_score"] = round(100 - avg, 1)

    hardest = max(lyrics, key=lambda l: int(l.get("difficulty_score", 0)))
    enriched["hardest_line"] = {
        "line": hardest.get("line", ""),
        "romanized": hardest.get("romanized", ""),
        "difficulty_score": hardest.get("difficulty_score", 0),
        "phoneme_hints": hardest.get("phoneme_hints", ""),
        "vocal_arc": hardest.get("vocal_arc", ""),
        "breath_coach": hardest.get("breath_coach", ""),
    }

    # ── Emotion stats ────────────────────────────────────────────────────────
    emotions = [l.get("emotion", "neutral") for l in lyrics]
    emotion_counts = Counter(emotions)
    enriched["emotion_distribution"] = dict(emotion_counts)
    enriched["dominant_emotion"] = emotion_counts.most_common(1)[0][0] if emotion_counts else "neutral"

    # ── Emotion arc (timeline data for the frontend chart) ───────────────────
    emotion_to_num = {
        "hype": 7,
        "empowering": 6,
        "aggressive": 5,
        "playful": 4,
        "neutral": 3,
        "soft": 2,
        "longing": 1,
        "sad": 0,
    }
    enriched["emotion_arc"] = [
        {
            "index": l.get("index", i),
            "emotion": l.get("emotion", "neutral"),
            "value": emotion_to_num.get(str(l.get("emotion", "neutral")), 3),
        }
        for i, l in enumerate(lyrics)
    ]

    # ── Practice priority ────────────────────────────────────────────────────
    high = [l.get("line", "") for l in lyrics if l.get("practice_priority") == "high"]
    enriched["high_priority_lines"] = [x for x in high if x][:10]
    enriched["high_priority_count"] = len(high)

    # ── Practice session: top 5 lines by difficulty+priority score ───────────
    def _practice_score(l: dict) -> float:
        d = int(l.get("difficulty_score", 50))
        p = l.get("practice_priority", "medium")
        p_boost = 30 if p == "high" else 10 if p == "medium" else 0
        repeat_boost = 8 if l.get("is_repeated") else 0
        return d + p_boost + repeat_boost

    sorted_lines = sorted(lyrics, key=_practice_score, reverse=True)
    enriched["practice_session"] = [
        {
            "index": l.get("index"),
            "line": l.get("line", ""),
            "romanized": l.get("romanized", ""),
            "difficulty_score": l.get("difficulty_score", 50),
            "practice_priority": l.get("practice_priority", "medium"),
            "emotion": l.get("emotion", "neutral"),
            "vocal_arc": l.get("vocal_arc", "sustained"),
            "breath_coach": l.get("breath_coach", ""),
        }
        for l in sorted_lines[:5]
    ]

    # ── Vocal arc distribution ───────────────────────────────────────────────
    arcs = [l.get("vocal_arc", "sustained") for l in lyrics]
    enriched["vocal_arc_distribution"] = dict(Counter(arcs))

    # ── Language stats ───────────────────────────────────────────────────────
    langs = [l.get("language", "en") for l in lyrics]
    enriched["language_distribution"] = dict(Counter(langs))

    # ── Word stats ───────────────────────────────────────────────────────────
    all_words = []
    for l in lyrics:
        words = str(l.get("line", "") or "").split()
        all_words.extend(words)
    enriched["word_count"] = len(all_words)
    enriched["avg_word_length"] = (
        round(sum(len(w) for w in all_words) / len(all_words), 1) if all_words else 0.0
    )

    # ── Repeat stats ─────────────────────────────────────────────────────────
    repeated_count = sum(1 for l in lyrics if l.get("is_repeated"))
    enriched["repeated_lines_count"] = repeated_count

    # ── Per-line vocal_arc + breath_coach enrichment (if missing) ────────────
    for l in lyrics:
        if not l.get("vocal_arc"):
            l["vocal_arc"] = _compute_vocal_arc(
                str(l.get("line", "") or ""),
                str(l.get("syllables", "") or ""),
                str(l.get("emotion", "neutral") or "neutral"),
            )
        if not l.get("breath_coach"):
            l["breath_coach"] = _compute_breath_coach(
                int(l.get("difficulty_score", 50)),
                str(l.get("emotion", "neutral") or "neutral"),
                str(l.get("syllables", "") or ""),
            )

    return enriched
