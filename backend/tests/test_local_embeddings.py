from app.services.local_embeddings import EMBEDDING_DIMENSION, embed_text


def test_embed_text_has_stable_dimension() -> None:
    vector = embed_text("hello enterprise data assistant")
    assert len(vector) == EMBEDDING_DIMENSION


def test_embed_text_is_deterministic() -> None:
    assert embed_text("same text") == embed_text("same text")
