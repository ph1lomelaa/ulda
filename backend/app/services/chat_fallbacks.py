CASUAL_MESSAGES = {
    "hi",
    "hello",
    "hey",
    "привет",
    "how are you",
    "hi how are you",
    "thanks",
    "thank you",
}

DOCUMENT_HINTS = {
    "file",
    "files",
    "document",
    "documents",
    "pdf",
    "uploaded",
    "upload",
    "source",
    "sources",
    "lecture",
    "slides",
    "notes",
}


def should_prefer_indexed_context(question: str, has_retrieval_hits: bool) -> bool:
    normalized = question.strip().lower()
    if has_retrieval_hits:
        return True
    return any(token in normalized for token in DOCUMENT_HINTS)


def build_no_sources_reply(question: str, unified_answer: str | None) -> str:
    if unified_answer:
        return unified_answer

    normalized = question.strip().lower()
    if normalized in CASUAL_MESSAGES:
        return "Hello! How can I help you today?"

    if any(token in normalized for token in DOCUMENT_HINTS):
        return (
            "I do not have any indexed sources yet, so I cannot answer from your uploaded materials yet. "
            "You can still ask general questions, or upload a document and wait until indexing completes "
            "for document-grounded answers."
        )

    return (
        "I can still help with general questions even though there are no indexed sources yet. "
        "Ask anything, or upload a document if you want answers grounded in your materials."
    )


def build_llm_unavailable_reply(
    *,
    question: str,
    has_indexed_sources: bool,
    bullet_points: list[str] | None = None,
) -> str:
    normalized = question.strip().lower()
    bullet_points = bullet_points or []

    if bullet_points:
        return (
            "I found relevant material in your indexed sources.\n\n"
            "Relevant context:\n"
            f"{chr(10).join(bullet_points)}"
        )

    if normalized in CASUAL_MESSAGES:
        return "Hello! How can I help you today?"

    if has_indexed_sources and any(token in normalized for token in DOCUMENT_HINTS):
        return (
            "I have indexed sources available, but the language model is currently unavailable for synthesis. "
            "Try again in a moment, or ask a more specific question about the uploaded material."
        )

    return "I can still help, but the language model is currently unavailable. Please try again in a moment."
