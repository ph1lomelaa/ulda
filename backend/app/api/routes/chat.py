from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.user import User
from app.schemas.chat import (
    ConversationCreateRequest,
    ConversationCreateResponse,
    ConversationMessagesResponse,
    ConversationRead,
    MessageCreateRequest,
    MessageRead,
    MessageReplyResponse,
)
from app.services.audit import create_audit_log
from app.services.chat_service import build_assistant_reply


router = APIRouter()


def _serialize_conversation(conversation: Conversation, last_message: Message | None = None) -> ConversationRead:
    preview = last_message.content[:120] if last_message is not None else None
    return ConversationRead(
        id=conversation.id,
        title=conversation.title,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        last_message_preview=preview,
    )


def _get_conversation_or_404(db: Session, user: User, conversation_id: str) -> Conversation:
    conversation = db.scalar(
        select(Conversation).where(Conversation.id == conversation_id, Conversation.user_id == user.id)
    )
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return conversation


@router.get("/conversations", response_model=list[ConversationRead])
def list_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> list[ConversationRead]:
    conversations = db.scalars(
        select(Conversation).where(Conversation.user_id == current_user.id).order_by(Conversation.updated_at.desc())
    ).all()
    output: list[ConversationRead] = []
    for conversation in conversations:
        last_message = db.scalar(
            select(Message)
            .where(Message.conversation_id == conversation.id)
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        output.append(_serialize_conversation(conversation, last_message))
    return output


@router.post("/conversations", response_model=ConversationCreateResponse, status_code=status.HTTP_201_CREATED)
def create_conversation(
    payload: ConversationCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConversationCreateResponse:
    conversation = Conversation(user_id=current_user.id, title=payload.title.strip())
    db.add(conversation)
    db.flush()
    create_audit_log(
        db=db,
        user=current_user,
        action="conversation_created",
        entity_type="conversation",
        entity_id=conversation.id,
        detail=conversation.title,
    )
    db.commit()
    db.refresh(conversation)
    return ConversationCreateResponse(conversation=_serialize_conversation(conversation))


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    conversation = _get_conversation_or_404(db, current_user, conversation_id)
    deleted_title = conversation.title
    db.delete(conversation)
    create_audit_log(
        db=db,
        user=current_user,
        action="conversation_deleted",
        entity_type="conversation",
        entity_id=conversation_id,
        detail=deleted_title[:255],
    )
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/conversations/{conversation_id}/messages", response_model=ConversationMessagesResponse)
def get_conversation_messages(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConversationMessagesResponse:
    conversation = _get_conversation_or_404(db, current_user, conversation_id)
    messages = db.scalars(
        select(Message).where(Message.conversation_id == conversation.id).order_by(Message.created_at.asc())
    ).all()
    last_message = messages[-1] if messages else None
    return ConversationMessagesResponse(
        conversation=_serialize_conversation(conversation, last_message),
        messages=[MessageRead.from_model(message) for message in messages],
    )


@router.post("/conversations/{conversation_id}/messages", response_model=MessageReplyResponse)
def create_message(
    conversation_id: str,
    payload: MessageCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageReplyResponse:
    conversation = _get_conversation_or_404(db, current_user, conversation_id)
    content = payload.content.strip()

    user_message = Message(conversation_id=conversation.id, role="user", content=content, citations_json=None)
    db.add(user_message)
    db.flush()

    if conversation.title == "New Conversation":
        conversation.title = content[:60]

    create_audit_log(
        db=db,
        user=current_user,
        action="question_asked",
        entity_type="conversation",
        entity_id=conversation.id,
        detail=content[:255],
    )

    assistant_message = build_assistant_reply(
        db=db,
        user=current_user,
        conversation=conversation,
        user_message=user_message,
    )
    db.commit()
    db.refresh(conversation)
    db.refresh(user_message)
    db.refresh(assistant_message)

    return MessageReplyResponse(
        conversation=_serialize_conversation(conversation, assistant_message),
        user_message=MessageRead.from_model(user_message),
        assistant_message=MessageRead.from_model(assistant_message),
    )


@router.get("/conversations/{conversation_id}/export")
def export_conversation(
    conversation_id: str,
    format: str = Query(default="md"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    conversation = _get_conversation_or_404(db, current_user, conversation_id)
    messages = db.scalars(
        select(Message).where(Message.conversation_id == conversation.id).order_by(Message.created_at.asc())
    ).all()

    if format not in {"md", "txt"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported export format")

    if format == "md":
        lines = [f"# {conversation.title}", ""]
        for message in messages:
            heading = "User" if message.role == "user" else "Assistant"
            lines.append(f"## {heading}")
            lines.append("")
            lines.append(message.content)
            lines.append("")
        content = "\n".join(lines)
        media_type = "text/markdown; charset=utf-8"
        filename = f"{conversation.title[:40].replace(' ', '_') or 'conversation'}.md"
    else:
        lines = [conversation.title, "=" * len(conversation.title), ""]
        for message in messages:
            heading = "User" if message.role == "user" else "Assistant"
            lines.append(f"{heading}:")
            lines.append(message.content)
            lines.append("")
        content = "\n".join(lines)
        media_type = "text/plain; charset=utf-8"
        filename = f"{conversation.title[:40].replace(' ', '_') or 'conversation'}.txt"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
