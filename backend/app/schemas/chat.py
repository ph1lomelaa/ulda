import json
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CitationRead(BaseModel):
    source_name: str
    document_title: str
    excerpt: str
    source_id: str
    document_id: str
    chunk_index: str
    score: str | None = None


class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    role: str
    content: str
    citations: list[CitationRead]
    created_at: datetime

    @classmethod
    def from_model(cls, message) -> "MessageRead":
        citations_payload = json.loads(message.citations_json) if message.citations_json else []
        return cls(
            id=message.id,
            role=message.role,
            content=message.content,
            citations=[CitationRead.model_validate(item) for item in citations_payload],
            created_at=message.created_at,
        )


class ConversationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    last_message_preview: str | None = None


class ConversationCreateRequest(BaseModel):
    title: str = Field(default="New Conversation", min_length=1, max_length=255)


class ConversationCreateResponse(BaseModel):
    conversation: ConversationRead


class MessageCreateRequest(BaseModel):
    content: str = Field(min_length=1, max_length=6000)


class ConversationMessagesResponse(BaseModel):
    conversation: ConversationRead
    messages: list[MessageRead]


class MessageReplyResponse(BaseModel):
    conversation: ConversationRead
    user_message: MessageRead
    assistant_message: MessageRead
