from unittest.mock import patch

from lyrflow.translator import translate_line
from lyrflow.ai_processor import _fallback_objects


def test_translation_fallback():
    with patch("lyrflow.translator.GoogleTranslator") as mock:
        mock.return_value.translate.side_effect = Exception("API down")
        result = translate_line("좋은 아침", "ko")
        assert result == "[translation unavailable]"


def test_ai_fallback_objects():
    lines = ["좋은 아침", "oh yeah"]
    with patch("lyrflow.translator.GoogleTranslator") as mock:
        mock.return_value.translate.side_effect = Exception("API down")
        result = _fallback_objects(lines)
    assert len(result) == 2
    assert result[0]["language"] == "ko"
    assert result[0]["translation"] == "[translation unavailable]"
    assert result[0]["confidence"] == "low"
    assert result[0]["romanized"] != ""

    assert result[1]["language"] == "en"
    assert result[1]["translation"] == lines[1]
    assert result[1]["confidence"] == "high"
    assert result[1]["romanized"] != ""

