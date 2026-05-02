from app.services.chat_fallbacks import build_llm_unavailable_reply, build_no_sources_reply


def test_no_sources_reply_uses_llm_answer_when_available() -> None:
    assert build_no_sources_reply("hello", "Custom LLM reply") == "Custom LLM reply"


def test_no_sources_reply_handles_casual_message_without_indexed_sources() -> None:
    assert build_no_sources_reply("привет", None) == "Hello! How can I help you today?"


def test_no_sources_reply_mentions_indexing_only_for_document_questions() -> None:
    reply = build_no_sources_reply("summarize my uploaded pdf", None)
    assert "indexed sources yet" in reply
    assert "uploaded materials" in reply


def test_llm_unavailable_reply_prefers_grounded_context_when_available() -> None:
    reply = build_llm_unavailable_reply(
        question="summarize my uploaded pdf",
        has_indexed_sources=True,
        bullet_points=["1. Algebra.pdf: Vector spaces and basis definitions."],
    )
    assert "Relevant context:" in reply
    assert "Algebra.pdf" in reply


def test_llm_unavailable_reply_stays_general_when_no_context_match() -> None:
    reply = build_llm_unavailable_reply(
        question="привет",
        has_indexed_sources=True,
        bullet_points=[],
    )
    assert reply == "Hello! How can I help you today?"
