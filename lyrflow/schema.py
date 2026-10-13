"""
schema.py — output JSON schema helpers (validation + dominant language).
"""

from __future__ import annotations

from collections import Counter
import re

REQUIRED_KEYS = {
    "index",
    "line",
    "language",
    "romanized",
    "translation",
    "syllables",
    "confidence",
    "emotion",
    "difficulty_score",
    "practice_priority",
    "phoneme_hints",
    "phoneme_map",
    "vocal_arc",
    "breath_coach",
}

_HANGUL_RE = re.compile(r"[\uAC00-\uD7A3]")
_JAPANESE_RE = re.compile(r"[\u3040-\u30FF\u4E00-\u9FFF]")
_LATIN_RE = re.compile(r"[A-Za-z]")
_NON_LATIN_RE = re.compile(r"[^\x00-\x7F]")


def compute_difficulty_score(line: str) -> int:
    """
    Heuristic difficulty score.
    Goal: make difficulty feel real (varying), not a flat constant.
    """
    if not line:
        return 0

    score = 0

    # length factor (cap)
    score += min(len(line) * 2, 50)

    has_hangul = bool(_HANGUL_RE.search(line))
    has_japanese = bool(_JAPANESE_RE.search(line))
    has_latin = bool(_LATIN_RE.search(line))

    # Korean/Japanese script complexity
    if has_hangul or has_japanese:
        score += 22

    # Mixed-script harder
    if has_latin and (has_hangul or has_japanese):
        score += 22

    # Chant / repetition / energy cues (language-agnostic)
    exclam = line.count("!") + line.count("！")
    qmark = line.count("?") + line.count("？")
    ellipsis = "..." in line or "…" in line
    has_non_latin = bool(_NON_LATIN_RE.search(line))

    if exclam >= 1:
        score += 10 + min(10, exclam * 5)
    if qmark >= 1:
        score += 6
    if ellipsis:
        score += 6

    # Non-KO/JA scripts: add a small complexity boost.
    if has_non_latin and not (has_hangul or has_japanese):
        score += 14

    # Word repetition density (only works where spaces exist; still deterministic).
    tokens = re.findall(r"\w+", (line or "").lower(), flags=re.UNICODE)
    if tokens:
        freq = Counter(tokens)
        repeats = max(freq.values()) if freq else 1
        if repeats >= 2:
            score += min(18, (repeats - 1) * 8)

    if any(t in (line or "").lower() for t in ["hey", "yeah", "jump", "la la"]):
        score += 12

    # Long lines harder
    if len(line) >= 20 and (has_hangul or has_japanese):
        score += 8

    # punctuation/intonation cues
    if "," in line or ":" in line or ";" in line:
        score += 8

    # Keep difficulty in a perceived 20..90 range for the UI.
    clamped = min(max(score, 20), 90)
    return int(clamped)


def detect_emotion(line: str) -> str:
    """
    Heuristic emotion detection.
    Must return one of the app's supported emotion values.
    """
    s = (line or "").lower()

    hype_triggers = ["yeah", "hey", "jump", "la la", "what's up", "lets go", "go!!!", "lets go"]
    exclam = line.count("!") + line.count("！")
    qmark = line.count("?") + line.count("？")
    ellipsis = "..." in line or "…" in line

    if any(t in s for t in hype_triggers) or exclam >= 2:
        return "hype"

    # Question energy without high exclamation is often confrontation/urgency.
    if qmark >= 1:
        if any(t in s for t in ["why", "can't", "don't", "stop", "no ", "force", "do it", "prove"]):
            return "aggressive"
        return "hype"

    if ellipsis:
        if "dream" in s or "꿈" in line or "夢" in line or "恋" in line or "愛" in line:
            return "longing"
        return "sad"

    if any(t in s for t in ["stop", "don't", "do not", "no ", "force", "make me", "listen"]):
        return "aggressive"

    # Dream/hope language -> longing
    if "꿈" in line or "dream" in s or "夢" in line or "恋" in line or "愛" in line or "秘密" in line:
        return "longing"

    # Why/aggression language
    if "왜" in line or "why" in s or "許せない" in line or "できない" in line:
        return "aggressive"

    # I don't know / sadness language
    if "몰라" in line or "泣" in line or "嘘" in line or "嘘か" in line:
        return "sad"

    # Soft / playful cues
    if "笑顔" in line or "微笑" in line or "かわいい" in line or "笑って" in line or "smile" in s:
        return "soft"

    # Empowering cues (strong identity/achievement)
    if "無敵" in line or "最強" in line or "勝" in line or "信じ" in line:
        return "empowering"

    # Smile/cute-ish playful lines
    if "わくわく" in line or "fun" in s or "play" in s or "secret" in s:
        return "playful"

    return "neutral"


def compute_practice_priority(difficulty_score: int, emotion: str) -> str:
    diff = int(difficulty_score)
    e = (emotion or "neutral").lower()

    # Very easy lines should always be low priority.
    if diff < 40:
        return "low"

    if diff >= 70 or e in ["aggressive", "longing", "empowering"]:
        return "high"

    return "medium"


def _compute_vocal_arc(line: str, syllables: str, emotion: str) -> str:
    """
    Deterministic fallback for vocal_arc classification.
    Returns one of: rising, falling, sustained, staccato
    """
    s = (line or "").strip()
    syl = (syllables or "")

    # Staccato: lots of hyphens (many short syllables) or very short line with caps
    hyphen_count = syl.count("-")
    if hyphen_count >= 6 or (len(s) <= 8 and s.isupper()):
        return "staccato"

    # Rising: question marks, ascending energy, hype
    if "?" in s or "？" in s or emotion in ["hype", "empowering"]:
        return "rising"

    # Falling: ellipsis, trailing commas, sad/longing ending
    if s.endswith("...") or s.endswith("…") or emotion in ["sad", "longing"]:
        return "falling"

    # Sustained: long lines with flowing feel or soft/neutral emotion
    if len(s) >= 20 or emotion in ["soft", "neutral"]:
        return "sustained"

    # Default: rising
    return "rising"


def _compute_breath_coach(difficulty: int, emotion: str, syllables: str) -> str:
    """
    Deterministic breath coaching tip based on difficulty + emotion + syllables.
    """
    syl_count = syllables.count("-") + 1 if syllables else 0

    if difficulty >= 75:
        if syl_count > 8:
            return "Take a full breath before this line—it's long and dense. Release steadily."
        return "This is a high-difficulty line. Control your diaphragm and don't rush the consonants."

    if difficulty >= 50:
        if emotion == "aggressive":
            return "Push air forcefully through consonant clusters but keep your throat relaxed."
        if emotion == "longing":
            return "Sustain the vowels gently here—let the longing breathe through the phrase."
        return "Moderate breath pressure. Keep a consistent airflow through the phrase."

    if emotion == "hype":
        return "Quick, punchy releases. Reset breath fast between chant beats."
    if emotion == "soft":
        return "Use minimal air—a whisper-light flow gives this line its softness."
    if emotion == "playful":
        return "Light and bouncy breath. Let your smile support the tone."

    return "Steady breath support throughout. Keep it natural and musical."


def dominant_language(lyrics: list[dict]) -> str:
    """
    Determine dominant language for the whole song.
    Returns: "ko" | "ja" | "en" | "mixed"
    """
    if not lyrics:
        return "en"

    counts = Counter(obj.get("language", "en") for obj in lyrics)
    ko_count = sum(v for k, v in counts.items() if k.startswith("ko") or k == "ko" or "ko" in k)
    ja_count = sum(v for k, v in counts.items() if k.startswith("ja") or k == "ja" or "ja" in k)
    en_count = counts.get("en", 0)
    total = len(lyrics)

    # If both Korean and Japanese appear in meaningful proportions, mark mixed.
    if total > 0 and (ko_count / total) > 0.2 and (ja_count / total) > 0.2:
        return "mixed"
    if ko_count >= ja_count and ko_count >= en_count:
        return "ko"
    if ja_count >= ko_count and ja_count >= en_count:
        return "ja"
    return "en"


def validate_line_object(obj: dict, index: int, original_line: str) -> dict:
    defaults = {
        "index": index,
        "line": original_line,
        "language": "en",
        "romanized": original_line,
        "translation": "[translation unavailable]",
        "syllables": "",
        "confidence": "low",
        "emotion": "neutral",
        "difficulty_score": 50,
        "practice_priority": "medium",
        "phoneme_hints": "",
        "phoneme_map": [],
        "vocal_arc": "sustained",
        "breath_coach": "Steady breath support throughout. Keep it natural and musical.",
    }

    if obj is None:
        obj = {}

    # Fill required keys; never remove keys (keeps compatibility with callers).
    for key in REQUIRED_KEYS:
        if key not in obj or obj[key] is None:
            obj[key] = defaults[key]

    # Enforce non-empty strings for romanized/translation.
    if obj.get("romanized", "") == "":
        obj["romanized"] = original_line
    if obj.get("translation", "") == "":
        obj["translation"] = "[translation unavailable]"
    if not isinstance(obj.get("phoneme_map", []), list):
        obj["phoneme_map"] = []

    # Perceived intelligence upgrade:
    confidence = obj.get("confidence", "low")
    looks_default = obj.get("difficulty_score", 50) == 50 and obj.get("emotion", "neutral") == "neutral"
    translation_unavailable = obj.get("translation") == "[translation unavailable]"

    if confidence == "low" or translation_unavailable or looks_default:
        line = obj.get("line", original_line) or original_line
        obj["emotion"] = detect_emotion(line)
        obj["difficulty_score"] = compute_difficulty_score(line)
        obj["practice_priority"] = compute_practice_priority(obj["difficulty_score"], obj["emotion"])

    # Compute vocal_arc + breath_coach if missing or empty
    if not obj.get("vocal_arc"):
        obj["vocal_arc"] = _compute_vocal_arc(
            str(obj.get("line", original_line) or ""),
            str(obj.get("syllables", "") or ""),
            str(obj.get("emotion", "neutral") or "neutral"),
        )
    if not obj.get("breath_coach"):
        obj["breath_coach"] = _compute_breath_coach(
            int(obj.get("difficulty_score", 50)),
            str(obj.get("emotion", "neutral") or "neutral"),
            str(obj.get("syllables", "") or ""),
        )

    # Optional aliases for frontend clarity (do not remove existing keys).
    obj.setdefault("original", original_line)
    obj.setdefault("difficulty", obj.get("difficulty_score"))
    obj.setdefault("priority", obj.get("practice_priority"))

    # Optional derived UI field.
    if "line_energy" not in obj:
        line = str(obj.get("line", original_line) or "")
        emotion = str(obj.get("emotion", "neutral") or "neutral").lower()
        is_repeated = bool(obj.get("is_repeated"))
        has_strong_punct = any(p in line for p in ["!", "?", "..."])
        if emotion in ["hype", "aggressive", "empowering"] or has_strong_punct or is_repeated:
            obj["line_energy"] = "high"
        elif emotion in ["longing", "sad"]:
            obj["line_energy"] = "medium"
        else:
            obj["line_energy"] = "low"

    return obj
