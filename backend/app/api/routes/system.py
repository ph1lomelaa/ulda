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
            "id": "gemini",
            "name": "Gemini",
            "description": "LLM synthesis on top of grounded retrieval context",
            "status": "active" if bool(settings.gemini_api_key) else "needs_config",
            "connected": bool(settings.gemini_api_key),
            "detail": settings.gemini_model if settings.gemini_api_key else "Set GEMINI_API_KEY to enable synthesis",
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
