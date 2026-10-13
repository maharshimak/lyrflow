import pytest

from lyrflow.pipeline import process_song
from lyrflow.schema import REQUIRED_KEYS


MOCK_LYRICS = """[Verse 1]
좋은 아침
나는 dream을 꿔
僕はokay
oh yeah la la la
—
"""

MOCK_AI_RESULT = [
    {
        "index": 0,
        "line": "좋은 아침",
        "language": "ko",
        "romanized": "joeun achim",
        "translation": "Good morning",
        "syllables": "jo-eun a-chim",
        "confidence": "high",
        "emotion": "neutral",
        "difficulty_score": 30,
        "practice_priority": "medium",
        "phoneme_hints": "",
        "phoneme_map": [],
    },
    {
        "index": 1,
        "line": "나는 dream을 꿔",
        "language": "mixed_ko",
        "romanized": "naneun dream-eul kkwo",
        "translation": "I dream of you",
        "syllables": "na-neun kkwo",
        "confidence": "high",
        "emotion": "longing",
        "difficulty_score": 55,
        "practice_priority": "medium",
        "phoneme_hints": "",
        "phoneme_map": [],
    },
    {
        "index": 2,
        "line": "僕はokay",
        "language": "mixed_ja",
        "romanized": "boku wa okay",
        "translation": "I'm okay",
        "syllables": "bo-ku-wa",
        "confidence": "high",
        "emotion": "neutral",
        "difficulty_score": 40,
        "practice_priority": "medium",
        "phoneme_hints": "",
        "phoneme_map": [],
    },
    {
        "index": 3,
        "line": "oh yeah la la la",
        "language": "en",
        "romanized": "oh yeah la la la",
        "translation": "oh yeah la la la",
        "syllables": "",
        "confidence": "low",
        "emotion": "neutral",
        "difficulty_score": 10,
        "practice_priority": "low",
        "phoneme_hints": "",
        "phoneme_map": [],
    },
    {
        "index": 4,
        "line": "—",
        "language": "en",
        "romanized": "—",
        "translation": "—",
        "syllables": "",
        "confidence": "low",
        "emotion": "neutral",
        "difficulty_score": 1,
        "practice_priority": "low",
        "phoneme_hints": "",
        "phoneme_map": [],
    },
]


def test_pipeline_schema(monkeypatch):
    monkeypatch.setattr("lyrflow.fetcher.fetch_lyrics", lambda *a, **kw: MOCK_LYRICS)
    monkeypatch.setattr("lyrflow.ai_processor.process_lines_with_ai", lambda *a, **kw: MOCK_AI_RESULT)

    result = process_song("Test Song", "Test Artist", "fake_genius", "fake_openai")

    assert "lyrics" in result
    assert result["total_lines"] == len(result["lyrics"])

    line_texts = [o["line"] for o in result["lyrics"]]
    assert "[Verse 1]" not in line_texts
    assert "[]" not in line_texts

    for obj in result["lyrics"]:
        assert REQUIRED_KEYS.issubset(obj.keys())
        assert obj["romanized"] != ""
        assert obj["translation"] != ""

