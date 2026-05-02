from types import SimpleNamespace
import sys

from app.models.conversation import Conversation
from app.models.data_source import DataSource
from app.models.message import Message
from app.models.user import User
from app.services.chat_service import build_assistant_reply


class _ScalarResult:
    def __init__(self, values):
        self._values = values

    def all(self):
        return self._values


class _FakeDb:
    def __init__(self, scalar_batches):
        self._scalar_batches = list(scalar_batches)
        self.added = []

    def scalars(self, _query):
        return _ScalarResult(self._scalar_batches.pop(0))

    def add(self, item):
        self.added.append(item)


def test_build_assistant_reply_uses_llm_without_sources(monkeypatch) -> None:
    db = _FakeDb([[], []])
    user = User(id="user-1", email="user@example.com", password_hash="x", name="User", role="user")
    conversation = Conversation(id="conv-1", user_id=user.id, title="Test")
    user_message = Message(id="msg-1", conversation_id=conversation.id, role="user", content="объясни блокчейн")

    monkeypatch.setattr(
        "app.services.chat_service.generate_unified_answer",
        lambda **kwargs: "LLM general answer",
    )

    assistant_message = build_assistant_reply(
        db=db,
        user=user,
        conversation=conversation,
        user_message=user_message,
    )

    assert assistant_message.content == "LLM general answer"


def test_build_assistant_reply_uses_llm_when_sources_have_no_match(monkeypatch) -> None:
    db = _FakeDb([[], [DataSource(id="src-1", user_id="user-1", name="Docs", type="PDF", status="ready")]])
    user = User(id="user-1", email="user@example.com", password_hash="x", name="User", role="user")
    conversation = Conversation(id="conv-1", user_id=user.id, title="Test")
    user_message = Message(id="msg-1", conversation_id=conversation.id, role="user", content="объясни блокчейн")

    fake_chroma_module = SimpleNamespace(
        chroma_store=SimpleNamespace(
            query_document_chunks=lambda **kwargs: {"documents": [[]], "metadatas": [[]], "distances": [[]]}
        )
    )
    monkeypatch.setitem(sys.modules, "app.services.chroma_store", fake_chroma_module)
    monkeypatch.setattr(
        "app.services.chat_service.generate_unified_answer",
        lambda **kwargs: "LLM answer without file match",
    )

    assistant_message = build_assistant_reply(
        db=db,
        user=user,
        conversation=conversation,
        user_message=user_message,
    )

    assert assistant_message.content == "LLM answer without file match"
