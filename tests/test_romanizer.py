from lyrflow.romanizer import romanize_korean, romanize_line


def test_korean_basic():
    result = romanize_korean("좋은 아침")
    assert "achim" in result.lower()


def test_mixed_korean_preserves_latin():
    result = romanize_line("나는 dream을 꿔", "mixed_ko")
    assert "dream" in result
    assert "naneun" in result.lower() or "naneun" in result.replace(" ", "").lower()


def test_mixed_japanese_preserves_latin():
    result = romanize_line("僕はokay", "mixed_ja")
    assert "okay" in result
    assert "boku" in result.lower()


def test_english_unchanged():
    result = romanize_line("oh yeah", "en")
    assert result == "oh yeah"

