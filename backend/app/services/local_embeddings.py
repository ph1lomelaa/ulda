import hashlib
import math
import re


TOKEN_RE = re.compile(r"[a-zA-Z0-9_]+")
EMBEDDING_DIMENSION = 256


def embed_text(text: str) -> list[float]:
    vector = [0.0] * EMBEDDING_DIMENSION
    tokens = TOKEN_RE.findall(text.lower())
    if not tokens:
        return vector

    for token in tokens:
        digest = hashlib.md5(token.encode("utf-8")).digest()
        bucket = int.from_bytes(digest[:2], "big") % EMBEDDING_DIMENSION
        sign = 1.0 if digest[2] % 2 == 0 else -1.0
        weight = 1.0 + (digest[3] / 255.0)
        vector[bucket] += sign * weight

    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0:
        return vector
    return [value / norm for value in vector]
