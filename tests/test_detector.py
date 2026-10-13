from lyrflow.detector import detect_line_language


def test_pure_korean():
    assert detect_line_language("좋은 아침") == "ko"


def test_mixed_japanese():
    assert detect_line_language("僕はokay") == "mixed_ja"


def test_mixed_korean():
    assert detect_line_language("나는 dream을 꿔") == "mixed_ko"


def test_english():
    assert detect_line_language("oh yeah la la") == "en"


def test_symbol_only():
    assert detect_line_language("—") == "en"

