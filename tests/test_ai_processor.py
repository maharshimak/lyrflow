import json
from unittest.mock import patch

from lyrflow.ai_processor import _fallback_objects, _parse_ai_response, process_lines_with_ai
from lyrflow.schema import REQUIRED_KEYS


LINES = ["좋은 아침", "나는 dream을 꿔", "oh yeah"]


def _make_valid_array(lines: list[str]):
    return [
        {
            "index": i,
            "line": l,
            "language": "en",
            "romanized": f"rom{i}",
            "translation": f"trans{i}",
            "syllables": "",
            "confidence": "high",
            "emotion": "neutral",
            "difficulty_score": 30,
            "practice_priority": "low",
            "phoneme_hints": "",
            "phoneme_map": [],
        }
        for i, l in enumerate(lines)
    ]


def test_parse_valid_array():
    content = json.dumps(_make_valid_array(LINES))
    result = _parse_ai_response(content, LINES)
    assert len(result) == len(LINES)
    for obj in result:
        assert REQUIRED_KEYS.issubset(obj.keys())


def test_parse_wrapped_object():
    wrapped = {"lyrics": _make_valid_array(LINES)}
    content = json.dumps(wrapped)
    result = _parse_ai_response(content, LINES)
    assert len(result) == len(LINES)


def test_parse_length_mismatch_recovery():
    short = _make_valid_array(LINES[:2])
    content = json.dumps(short)
    with patch("lyrflow.translator.GoogleTranslator") as mock:
        mock.return_value.translate.side_effect = Exception("API down")
        result = _parse_ai_response(content, LINES)

    assert len(result) == len(LINES)
    for i, obj in enumerate(result):
        assert obj["index"] == i
        assert REQUIRED_KEYS.issubset(obj.keys())
        assert obj["romanized"] != ""
        assert obj["translation"] != ""


def test_parse_invalid_json_fallback():
    with patch("lyrflow.translator.GoogleTranslator") as mock:
        mock.return_value.translate.side_effect = Exception("API down")
        result = _parse_ai_response("not json", LINES)

    assert len(result) == len(LINES)
    for obj in result:
        assert REQUIRED_KEYS.issubset(obj.keys())


def test_no_openai_key_uses_fallback():
    with (
        patch("lyrflow.ai_processor.OPENAI_API_KEY", ""),
        patch("lyrflow.translator.GoogleTranslator") as mock_translator,
    ):
        mock_translator.return_value.translate.side_effect = Exception("API down")
        result = process_lines_with_ai(LINES, "Test", "Artist")

    assert len(result) == len(LINES)
    for i, obj in enumerate(result):
        assert obj["index"] == i
        assert REQUIRED_KEYS.issubset(obj.keys())


def test_fallback_objects_are_safe():
    with patch("lyrflow.translator.GoogleTranslator") as mock:
        mock.return_value.translate.side_effect = Exception("API down")
        result = _fallback_objects(LINES)

    assert len(result) == len(LINES)
    for obj in result:
        assert REQUIRED_KEYS.issubset(obj.keys())
        assert obj["romanized"] != ""
        assert obj["translation"] != ""

