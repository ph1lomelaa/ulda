from fastapi import APIRouter

from app.core.config import settings


router = APIRouter()


@router.get("/integrations")
def get_integrations() -> list[dict[str, str | bool]]:
    return [
        {
            "id": "file-upload",
            "name": "Document Upload",
            "description": "PDF, CSV, TXT, MD and JSON ingestion through the ULDA upload pipeline",
            "status": "active",
            "connected": True,
            "detail": "Server-side background indexing enabled",
        },
        {
            "id": "chromadb",
            "name": "ChromaDB",
            "description": "Vector retrieval store for indexed chunks",
            "status": "active",
            "connected": True,
            "detail": "Per-user collections enabled",
        },
        {
            "id": "llm",
            "name": settings.llm_provider_label,
            "description": "LLM synthesis on top of grounded retrieval context",
            "status": "active" if settings.llm_enabled else "needs_config",
            "connected": settings.llm_enabled,
            "detail": (
                f"{settings.llm_model} via {settings.llm_effective_base_url}"
                if settings.llm_enabled
                else "Set LLM_API_KEY and LLM_MODEL to enable synthesis"
            ),
        },
        {
            "id": "postgres-external",
            "name": "External PostgreSQL Connector",
            "description": "Direct enterprise PostgreSQL connector with schema snapshot indexing",
            "status": "active",
            "connected": True,
            "detail": "Available from Data Sources",
        },
        {
            "id": "google-sheets",
            "name": "Google Sheets",
            "description": "Public Google Sheets connector through CSV export sync",
            "status": "active",
            "connected": True,
            "detail": "Available from Data Sources",
        },
    ]
