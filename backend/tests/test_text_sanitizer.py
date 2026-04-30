from app.services.text_sanitizer import sanitize_excerpt, sanitize_text


def test_sanitize_text_removes_nul_and_compacts_whitespace() -> None:
    assert sanitize_text("hello\x00 \n world") == "hello world"


def test_sanitize_excerpt_truncates_long_text() -> None:
    excerpt = sanitize_excerpt("a" * 30, limit=10)
    assert excerpt == "aaaaaaa..."
