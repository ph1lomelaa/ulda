from app.services.text_chunker import chunk_text


def test_chunk_text_splits_long_input() -> None:
    text = "alpha " * 600
    chunks = chunk_text(text, chunk_size=200, overlap=50)
    assert len(chunks) > 1
    assert all(chunk.strip() for chunk in chunks)


def test_chunk_text_returns_empty_for_blank_input() -> None:
    assert chunk_text("   \n  ") == []


def test_chunk_text_removes_nul_bytes() -> None:
    assert chunk_text("hello\x00world", chunk_size=100, overlap=20) == ["hello world"]
