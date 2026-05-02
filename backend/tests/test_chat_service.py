from app.services.chat_fallbacks import build_no_sources_reply


def test_no_sources_reply_uses_llm_answer_when_available() -> None:
    assert build_no_sources_reply("hello", "Custom LLM reply") == "Custom LLM reply"


def test_no_sources_reply_handles_casual_message_without_indexed_sources() -> None:
    assert build_no_sources_reply("привет", None).startswith("I can still help with general questions")


def test_no_sources_reply_mentions_indexing_only_for_document_questions() -> None:
    reply = build_no_sources_reply("summarize my uploaded pdf", None)
    assert "indexed sources yet" in reply
    assert "uploaded materials" in reply
