import re


MULTISPACE_RE = re.compile(r"\s+")


def sanitize_text(text: str) -> str:
    cleaned = text.replace("\x00", " ")
    cleaned = MULTISPACE_RE.sub(" ", cleaned)
    return cleaned.strip()


def sanitize_excerpt(text: str, limit: int = 240) -> str:
    cleaned = sanitize_text(text)
    if len(cleaned) <= limit:
        return cleaned
    return f"{cleaned[: max(limit - 3, 1)].rstrip()}..."
