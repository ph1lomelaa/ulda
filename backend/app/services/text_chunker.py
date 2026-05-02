from app.services.text_sanitizer import sanitize_text


def chunk_text(text: str, chunk_size: int = 1200, overlap: int = 200) -> list[str]:
    cleaned = sanitize_text(text)
    if not cleaned:
        return []

    chunks: list[str] = []
    start = 0
    text_length = len(cleaned)
    step = max(chunk_size - overlap, 1)

    while start < text_length:
        end = min(start + chunk_size, text_length)
        chunk = cleaned[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= text_length:
            break
        start += step

    return chunks
