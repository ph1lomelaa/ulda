from collections import defaultdict
from dataclasses import dataclass
from difflib import SequenceMatcher
import re

from app.core.config import settings
from app.services.text_sanitizer import sanitize_excerpt, sanitize_text


TOKEN_RE = re.compile(r"[0-9A-Za-z\u0400-\u04FF]+")
STOP_TOKENS = {
    "the",
    "and",
    "for",
    "with",
    "from",
    "what",
    "about",
    "tell",
    "have",
    "this",
    "that",
    "your",
    "score",
    "scores",
    "grade",
    "grades",
    "оценка",
    "оценки",
    "группа",
    "группы",
    "tellme",
}


@dataclass
class RetrievedChunk:
    source_name: str
    document_title: str
    excerpt: str
    full_text: str
    source_id: str
    document_id: str
    chunk_index: int
    distance: float
    score: float
    lexical_score: float
    combined_score: float


def distance_to_score(distance: float) -> float:
    if distance < 0:
        return 1.0
    return 1.0 / (1.0 + distance)


def _tokenize(text: str) -> list[str]:
    return TOKEN_RE.findall(text.lower())


def _build_query_tokens(query: str) -> set[str]:
    return {
        token
        for token in _tokenize(query)
        if (len(token) >= 4 or token.isdigit()) and token not in STOP_TOKENS
    }


def _compute_lexical_score(*, query_tokens: set[str], source_name: str, document_title: str, text: str) -> float:
    if not query_tokens:
        return 0.0

    text_tokens = set(_tokenize(f"{source_name} {document_title} {text}"))
    overlap = query_tokens & text_tokens
    if not overlap:
        return 0.0

    title_tokens = set(_tokenize(f"{source_name} {document_title}"))
    title_overlap = query_tokens & title_tokens

    base_score = len(overlap) / len(query_tokens)
    title_bonus = len(title_overlap) / len(query_tokens) * 0.35
    return min(base_score + title_bonus, 1.0)


def prepare_retrieved_chunks(result: dict, *, query: str = "") -> list[RetrievedChunk]:
    documents = result.get("documents", [[]])[0]
    metadatas = result.get("metadatas", [[]])[0]
    distances = result.get("distances", [[]])[0]
    query_tokens = _build_query_tokens(query)

    prepared: list[RetrievedChunk] = []
    for document_text, metadata, distance in zip(documents, metadatas, distances):
        safe_text = sanitize_text(str(document_text))
        if not safe_text:
            continue

        normalized_distance = float(distance)
        score = distance_to_score(normalized_distance)
        if score < settings.retrieval_score_threshold:
            continue

        source_name = str(metadata.get("source_name", "Unknown Source"))
        document_title = str(metadata.get("document_title", "Unknown Document"))
        lexical_score = _compute_lexical_score(
            query_tokens=query_tokens,
            source_name=source_name,
            document_title=document_title,
            text=safe_text,
        )
        combined_score = score + (lexical_score * 0.8)

        prepared.append(
            RetrievedChunk(
                source_name=source_name,
                document_title=document_title,
                excerpt=sanitize_excerpt(safe_text, settings.citation_excerpt_chars),
                full_text=safe_text,
                source_id=str(metadata.get("source_id", "")),
                document_id=str(metadata.get("document_id", "")),
                chunk_index=int(metadata.get("chunk_index", 0)),
                distance=normalized_distance,
                score=score,
                lexical_score=lexical_score,
                combined_score=combined_score,
            )
        )

    has_lexical_matches = any(item.lexical_score > 0 for item in prepared)
    if has_lexical_matches:
        if len(query_tokens) <= 2:
            prepared = [item for item in prepared if item.lexical_score > 0]
        else:
            prepared = [item for item in prepared if item.lexical_score > 0 or item.score >= 0.9]

    prepared.sort(key=lambda item: (-item.combined_score, -item.lexical_score, -item.score, item.distance, item.chunk_index))
    return _deduplicate_chunks(prepared)


def _deduplicate_chunks(chunks: list[RetrievedChunk]) -> list[RetrievedChunk]:
    unique: list[RetrievedChunk] = []
    per_document_counts: dict[str, int] = defaultdict(int)

    for candidate in chunks:
        if per_document_counts[candidate.document_id] >= settings.retrieval_max_chunks_per_document:
            continue

        is_duplicate = False
        for existing in unique:
            if candidate.document_id != existing.document_id:
                continue
            similarity = SequenceMatcher(None, candidate.excerpt, existing.excerpt).ratio()
            if similarity >= settings.retrieval_dedup_similarity:
                is_duplicate = True
                break

        if is_duplicate:
            continue

        unique.append(candidate)
        per_document_counts[candidate.document_id] += 1

        if len(unique) >= settings.retrieval_context_limit:
            break

    return unique


def build_citations(chunks: list[RetrievedChunk]) -> list[dict[str, str]]:
    return [
        {
            "source_name": chunk.source_name,
            "document_title": chunk.document_title,
            "excerpt": chunk.excerpt,
            "source_id": chunk.source_id,
            "document_id": chunk.document_id,
            "chunk_index": str(chunk.chunk_index),
            "score": f"{chunk.score:.4f}",
        }
        for chunk in chunks
    ]


def build_context_blocks(chunks: list[RetrievedChunk]) -> list[str]:
    blocks: list[str] = []
    for index, chunk in enumerate(chunks, start=1):
        blocks.append(
            (
                f"[Context {index}]\n"
                f"Source: {chunk.source_name}\n"
                f"Document: {chunk.document_title}\n"
                f"Chunk Index: {chunk.chunk_index}\n"
                f"Relevance Score: {chunk.score:.3f}\n"
                f"Text: {chunk.full_text}"
            )
        )
    return blocks


def build_history_blocks(messages: list[tuple[str, str]]) -> list[str]:
    history: list[str] = []
    for role, content in messages:
        safe_content = sanitize_text(content)
        if not safe_content:
            continue
        history.append(f"{role.title()}: {safe_content}")
    return history
