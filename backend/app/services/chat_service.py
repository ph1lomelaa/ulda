import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.conversation import Conversation
from app.models.data_source import DataSource
from app.models.message import Message
from app.models.user import User
from app.services.audit import create_audit_log
from app.services.chroma_store import chroma_store
from app.services.rag_pipeline import build_citations, build_context_blocks, build_history_blocks, prepare_retrieved_chunks
from app.services.llm_service import generate_unified_answer
from app.services.text_sanitizer import sanitize_excerpt


CASUAL_MESSAGES = {
    "hi",
    "hello",
    "hey",
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


def _should_prefer_indexed_context(question: str, has_retrieval_hits: bool) -> bool:
    normalized = question.strip().lower()
    if has_retrieval_hits:
        return True
    return any(token in normalized for token in DOCUMENT_HINTS)


def build_assistant_reply(
    *,
    db: Session,
    user: User,
    conversation: Conversation,
    user_message: Message,
) -> Message:
    history_messages = db.scalars(
        select(Message)
        .where(Message.conversation_id == conversation.id, Message.id != user_message.id)
        .order_by(Message.created_at.desc())
        .limit(settings.conversation_history_limit)
    ).all()
    history_messages.reverse()
    history_blocks = build_history_blocks([(message.role, message.content) for message in history_messages])

    ready_sources = db.scalars(
        select(DataSource).where(DataSource.user_id == user.id, DataSource.status == "ready")
    ).all()

    if not ready_sources:
        citations: list[dict[str, str]] = []
        unified_answer = generate_unified_answer(
            question=user_message.content,
            history_blocks=history_blocks,
            context_blocks=[],
            has_indexed_sources=False,
            prefer_indexed_context=False,
        )
        reply_text = unified_answer or (
            "I do not have any indexed sources yet. You can still chat with me generally, or upload a document "
            "and wait until indexing reaches 100% if you want document-grounded answers."
        )
    else:
        result = chroma_store.query_document_chunks(
            user_id=user.id,
            query=user_message.content,
            limit=settings.retrieval_candidate_limit,
        )
        chunks = prepare_retrieved_chunks(result, query=user_message.content)
        citations = build_citations(chunks)
        context_blocks = build_context_blocks(chunks)

        bullet_points = [
            f"{index}. {chunk.source_name} / {chunk.document_title}: {chunk.excerpt}"
            for index, chunk in enumerate(chunks, start=1)
        ]
        unified_answer = generate_unified_answer(
            question=user_message.content,
            history_blocks=history_blocks,
            context_blocks=context_blocks,
            has_indexed_sources=True,
            prefer_indexed_context=_should_prefer_indexed_context(user_message.content, bool(bullet_points)),
        )
        if unified_answer:
            reply_text = unified_answer
        elif bullet_points:
            reply_text = (
                "I searched your indexed sources and found the most relevant passages for this question.\n\n"
                "Relevant context:\n"
                f"{chr(10).join(bullet_points)}\n\n"
                "LLM synthesis is not enabled yet, so this reply is showing the grounded retrieval context directly."
            )
        else:
            if user_message.content.strip().lower() in CASUAL_MESSAGES:
                reply_text = "Hello! How can I help you today?"
            else:
                reply_text = (
                    "I have indexed sources available, but I could not find a strong match for that question yet. "
                    "Try referring to the uploaded material more specifically, such as the project title, topic, "
                    "or concept you want to explore."
                )

    assistant_message = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=reply_text,
        citations_json=json.dumps(citations, ensure_ascii=True),
    )
    db.add(assistant_message)
    create_audit_log(
        db=db,
        user=user,
        action="chat_reply_generated",
        entity_type="conversation",
        entity_id=conversation.id,
        detail=sanitize_excerpt(f"Question length: {len(user_message.content)}; citations: {len(citations)}", 255),
    )
    return assistant_message
