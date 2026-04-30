from datetime import UTC, datetime
import json
from pathlib import Path

from sqlalchemy import delete

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.data_source import DataSource
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.source_sync_run import SourceSyncRun
from app.models.user import User
from app.services.audit import create_audit_log
from app.services.chroma_store import chroma_store
from app.services.file_text_extractor import extract_text
from app.services.google_sheets_connector import extract_sheet_text
from app.services.postgres_connector import extract_snapshot_text
from app.services.text_chunker import chunk_text
from app.services.text_sanitizer import sanitize_text


def process_uploaded_document(*, source_id: str, document_id: str, sync_run_id: str) -> None:
    db = SessionLocal()
    try:
        source = db.get(DataSource, source_id)
        document = db.get(Document, document_id)
        sync_run = db.get(SourceSyncRun, sync_run_id)
        if source is None or document is None or sync_run is None:
            return

        sync_run.status = "processing"
        sync_run.stage = "extracting_text"
        sync_run.progress_percent = 10
        sync_run.started_at = datetime.now(UTC)
        sync_run.error_message = None
        source.status = "processing"
        document.status = "processing"
        db.commit()

        if source.type == "POSTGRESQL":
            if not source.config_json:
                raise ValueError("PostgreSQL source is missing connection config")
            text = extract_snapshot_text(json.loads(source.config_json))
            document.storage_path = ""
            document.mime_type = "application/x-postgresql-source"
        elif source.type == "GOOGLE_SHEETS":
            if not source.config_json:
                raise ValueError("Google Sheets source is missing connection config")
            text = extract_sheet_text(json.loads(source.config_json))
            document.storage_path = ""
            document.mime_type = "application/x-google-sheets-source"
        else:
            text = extract_text(Path(document.storage_path))
        text = sanitize_text(text)
        if not text.strip():
            raise ValueError("Uploaded file does not contain extractable text")

        sync_run.stage = "chunking"
        sync_run.progress_percent = 35
        db.commit()

        chunks = chunk_text(text)
        if not chunks:
            raise ValueError("Unable to generate chunks from uploaded file")

        chroma_store.delete_document_chunks(user_id=source.user_id, document_id=document.id)
        db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == document.id))
        db.commit()

        chunk_rows: list[DocumentChunk] = []
        total_chunks = len(chunks)
        sync_run.total_chunks = total_chunks
        sync_run.processed_chunks = 0
        db.commit()

        for index, content in enumerate(chunks):
            chunk_row = DocumentChunk(
                document_id=document.id,
                chunk_index=index,
                content=content,
                char_count=len(content),
            )
            db.add(chunk_row)
            db.flush()
            chunk_rows.append(chunk_row)

            sync_run.processed_chunks = index + 1
            sync_run.progress_percent = 35 + int(((index + 1) / total_chunks) * 35)
            db.commit()

        document.content_chars = len(text)
        document.chunk_count = total_chunks
        document.status = "indexed_locally"
        sync_run.stage = "uploading_to_chroma"
        sync_run.progress_percent = 75
        db.commit()

        chroma_store.upsert_document_chunks(
            user_id=source.user_id,
            source_id=source.id,
            source_name=source.name,
            document_id=document.id,
            document_title=document.original_filename,
            chunks=[
                {
                    "chunk_id": row.id,
                    "chunk_index": row.chunk_index,
                    "content": row.content,
                }
                for row in chunk_rows
            ],
        )

        sync_run.status = "completed"
        sync_run.stage = "completed"
        sync_run.progress_percent = 100
        sync_run.completed_at = datetime.now(UTC)
        source.status = "ready"
        document.status = "ready"
        user = db.get(User, source.user_id)
        if user is not None:
            create_audit_log(
                db=db,
                user=user,
                action="source_index_completed",
                entity_type="data_source",
                entity_id=source.id,
                detail=document.original_filename,
            )
        db.commit()
    except Exception as exc:
        db.rollback()
        sync_run = db.get(SourceSyncRun, sync_run_id)
        source = db.get(DataSource, source_id)
        document = db.get(Document, document_id)
        if sync_run is not None:
            sync_run.status = "failed"
            sync_run.stage = "failed"
            sync_run.error_message = str(exc)
            sync_run.completed_at = datetime.now(UTC)
        if source is not None:
            source.status = "failed"
        if document is not None:
            document.status = "failed"
        if source is not None:
            user = db.get(User, source.user_id)
            if user is not None:
                create_audit_log(
                    db=db,
                    user=user,
                    action="source_index_failed",
                    entity_type="data_source",
                    entity_id=source.id,
                    detail=sanitize_text(str(exc))[:255],
                )
        db.commit()
    finally:
        db.close()


def build_storage_path(filename: str) -> Path:
    timestamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S%f")
    safe_name = filename.replace("/", "_").replace("\\", "_").replace(" ", "_")
    return settings.upload_storage_path / f"{timestamp}_{safe_name}"


def create_resync_run(*, db, source: DataSource, document: Document) -> SourceSyncRun:
    sync_run = SourceSyncRun(
        source_id=source.id,
        document_id=document.id,
        status="queued",
        stage="queued",
        progress_percent=0,
        total_chunks=0,
        processed_chunks=0,
        error_message=None,
        started_at=None,
        completed_at=None,
    )
    source.status = "queued"
    document.status = "uploaded"
    db.add(sync_run)
    db.flush()
    return sync_run
