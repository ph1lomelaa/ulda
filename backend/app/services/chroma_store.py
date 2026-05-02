import chromadb

from app.core.config import settings
from app.services.local_embeddings import embed_text


class ChromaStore:
    def __init__(self) -> None:
        self._client = chromadb.HttpClient(host=settings.chroma_host, port=settings.chroma_port)

    def _collection_name(self, user_id: str) -> str:
        return f"{settings.chroma_collection_prefix}_{user_id}_documents"

    def upsert_document_chunks(
        self,
        *,
        user_id: str,
        source_id: str,
        source_name: str,
        document_id: str,
        document_title: str,
        chunks: list[dict[str, str | int]],
    ) -> None:
        collection = self._client.get_or_create_collection(name=self._collection_name(user_id))
        collection.upsert(
            ids=[str(item["chunk_id"]) for item in chunks],
            documents=[str(item["content"]) for item in chunks],
            embeddings=[embed_text(str(item["content"])) for item in chunks],
            metadatas=[
                {
                    "user_id": user_id,
                    "source_id": source_id,
                    "source_name": source_name,
                    "document_id": document_id,
                    "document_title": document_title,
                    "chunk_index": int(item["chunk_index"]),
                }
                for item in chunks
            ],
        )

    def query_document_chunks(self, *, user_id: str, query: str, limit: int = 5) -> dict:
        collection = self._client.get_or_create_collection(name=self._collection_name(user_id))
        return collection.query(
            query_embeddings=[embed_text(query)],
            n_results=limit,
            include=["documents", "metadatas", "distances"],
        )

    def delete_document_chunks(self, *, user_id: str, document_id: str) -> None:
        collection = self._client.get_or_create_collection(name=self._collection_name(user_id))
        collection.delete(where={"document_id": document_id})

    def delete_source_chunks(self, *, user_id: str, source_id: str) -> None:
        collection = self._client.get_or_create_collection(name=self._collection_name(user_id))
        collection.delete(where={"source_id": source_id})


chroma_store = ChromaStore()
