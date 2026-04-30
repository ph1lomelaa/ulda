from pathlib import Path
import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user, get_db
from app.models.data_source import DataSource
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.source_sync_run import SourceSyncRun
from app.models.user import User
from app.schemas.source import (
    ChunkPreviewRead,
    DataSourceDetailRead,
    DataSourceRead,
    GoogleSheetsSourceCreateRequest,
    PostgresSourceCreateRequest,
    SourceSyncRunRead,
    SourceUploadResponse,
)
from app.services.audit import create_audit_log
from app.services.chroma_store import chroma_store
from app.services.file_text_extractor import detect_source_type
from app.services.google_sheets_connector import validate_connection as validate_google_sheets_connection
from app.services.postgres_connector import validate_connection
from app.services.source_ingestion import build_storage_path, create_resync_run


router = APIRouter()


def _source_detail_query() -> list:
    return [
        selectinload(DataSource.documents),
        selectinload(DataSource.sync_runs),
    ]


def _serialize_source_detail(source: DataSource) -> DataSourceDetailRead:
    if not source.documents:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Source has no document")
    if not source.sync_runs:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Source has no sync runs")

    document = max(source.documents, key=lambda item: item.created_at)
    latest_sync_run = max(source.sync_runs, key=lambda item: item.created_at)
    return DataSourceDetailRead(
        id=source.id,
        name=source.name,
        type=source.type,
        status=source.status,
        created_at=source.created_at,
        updated_at=source.updated_at,
        document=document,
        latest_sync_run=latest_sync_run,
    )


@router.post("/uploads", response_model=SourceUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_source_document(
    file: UploadFile = File(...),
    name: str | None = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SourceUploadResponse:
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Filename is required")

    try:
        source_type = detect_source_type(file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    storage_path = build_storage_path(file.filename)
    content = await file.read()
    storage_path.parent.mkdir(parents=True, exist_ok=True)
    storage_path.write_bytes(content)

    source = DataSource(
        user_id=current_user.id,
        name=(name or Path(file.filename).stem).strip(),
        type=source_type.upper(),
        status="queued",
    )
    db.add(source)
    db.flush()

    document = Document(
        source_id=source.id,
        original_filename=file.filename,
        stored_filename=storage_path.name,
        mime_type=file.content_type or "application/octet-stream",
        storage_path=str(storage_path),
        size_bytes=len(content),
        status="uploaded",
    )
    db.add(document)
    db.flush()

    sync_run = SourceSyncRun(
        source_id=source.id,
        document_id=document.id,
        status="queued",
        stage="queued",
        progress_percent=0,
    )
    db.add(sync_run)
    create_audit_log(
        db=db,
        user=current_user,
        action="source_uploaded",
        entity_type="data_source",
        entity_id=source.id,
        detail=file.filename,
    )
    db.commit()

    db.refresh(source)
    db.refresh(document)
    db.refresh(sync_run)
    source.documents = [document]
    source.sync_runs = [sync_run]
    return SourceUploadResponse(source=_serialize_source_detail(source))


@router.post("/postgres", response_model=SourceUploadResponse, status_code=status.HTTP_201_CREATED)
def create_postgres_source(
    payload: PostgresSourceCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SourceUploadResponse:
    config = {
        "host": payload.host.strip(),
        "port": payload.port,
        "database": payload.database.strip(),
        "username": payload.username.strip(),
        "password": payload.password,
        "schema": payload.schema_name.strip(),
        "sslmode": payload.sslmode.strip(),
    }

    try:
        validate_connection(config)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"PostgreSQL connection failed: {exc}") from exc

    source = DataSource(
        user_id=current_user.id,
        name=payload.name.strip(),
        type="POSTGRESQL",
        config_json=json.dumps(config, ensure_ascii=True),
        status="queued",
    )
    db.add(source)
    db.flush()

    document = Document(
        source_id=source.id,
        original_filename=f"{payload.database}.postgresql",
        stored_filename="",
        mime_type="application/x-postgresql-source",
        storage_path="",
        size_bytes=0,
        status="uploaded",
    )
    db.add(document)
    db.flush()

    sync_run = SourceSyncRun(
        source_id=source.id,
        document_id=document.id,
        status="queued",
        stage="queued",
        progress_percent=0,
    )
    db.add(sync_run)
    create_audit_log(
        db=db,
        user=current_user,
        action="postgres_source_connected",
        entity_type="data_source",
        entity_id=source.id,
        detail=f"{payload.host}:{payload.port}/{payload.database}",
    )
    db.commit()

    db.refresh(source)
    db.refresh(document)
    db.refresh(sync_run)
    source.documents = [document]
    source.sync_runs = [sync_run]
    return SourceUploadResponse(source=_serialize_source_detail(source))


@router.post("/google-sheets", response_model=SourceUploadResponse, status_code=status.HTTP_201_CREATED)
def create_google_sheets_source(
    payload: GoogleSheetsSourceCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SourceUploadResponse:
    config = {
        "spreadsheet_id": payload.spreadsheet_id.strip(),
        "sheet_gid": payload.sheet_gid.strip(),
        "sheet_name": payload.sheet_name.strip() if payload.sheet_name else "",
    }

    try:
        validate_google_sheets_connection(config)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Google Sheets connection failed: {exc}") from exc

    source = DataSource(
        user_id=current_user.id,
        name=payload.name.strip(),
        type="GOOGLE_SHEETS",
        config_json=json.dumps(config, ensure_ascii=True),
        status="queued",
    )
    db.add(source)
    db.flush()

    display_name = payload.sheet_name.strip() if payload.sheet_name else payload.spreadsheet_id.strip()
    document = Document(
        source_id=source.id,
        original_filename=f"{display_name}.google-sheet",
        stored_filename="",
        mime_type="application/x-google-sheets-source",
        storage_path="",
        size_bytes=0,
        status="uploaded",
    )
    db.add(document)
    db.flush()

    sync_run = SourceSyncRun(
        source_id=source.id,
        document_id=document.id,
        status="queued",
        stage="queued",
        progress_percent=0,
    )
    db.add(sync_run)
    create_audit_log(
        db=db,
        user=current_user,
        action="google_sheets_source_connected",
        entity_type="data_source",
        entity_id=source.id,
        detail=f"{payload.spreadsheet_id}:{payload.sheet_gid}",
    )
    db.commit()

    db.refresh(source)
    db.refresh(document)
    db.refresh(sync_run)
    source.documents = [document]
    source.sync_runs = [sync_run]
    return SourceUploadResponse(source=_serialize_source_detail(source))


@router.get("", response_model=list[DataSourceRead])
def list_sources(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> list[DataSourceRead]:
    sources = db.scalars(
        select(DataSource).where(DataSource.user_id == current_user.id).order_by(DataSource.created_at.desc())
    ).all()
    return [DataSourceRead.model_validate(source) for source in sources]


@router.get("/{source_id}", response_model=DataSourceDetailRead)
def get_source(source_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> DataSourceDetailRead:
    source = db.scalar(
        select(DataSource)
        .options(*_source_detail_query())
        .where(DataSource.id == source_id, DataSource.user_id == current_user.id)
    )
    if source is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")
    return _serialize_source_detail(source)


@router.get("/{source_id}/sync-runs/{sync_run_id}", response_model=SourceSyncRunRead)
def get_sync_run(
    source_id: str,
    sync_run_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SourceSyncRunRead:
    sync_run = db.scalar(
        select(SourceSyncRun)
        .join(DataSource, DataSource.id == SourceSyncRun.source_id)
        .where(
            SourceSyncRun.id == sync_run_id,
            SourceSyncRun.source_id == source_id,
            DataSource.user_id == current_user.id,
        )
    )
    if sync_run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sync run not found")
    return SourceSyncRunRead.model_validate(sync_run)


@router.get("/{source_id}/chunks", response_model=list[ChunkPreviewRead])
def get_source_chunks(
    source_id: str,
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ChunkPreviewRead]:
    source = db.scalar(select(DataSource).where(DataSource.id == source_id, DataSource.user_id == current_user.id))
    if source is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")

    chunks = db.scalars(
        select(DocumentChunk)
        .join(Document, Document.id == DocumentChunk.document_id)
        .where(Document.source_id == source.id)
        .order_by(DocumentChunk.chunk_index.asc())
        .limit(limit)
    ).all()
    return [ChunkPreviewRead.model_validate(chunk) for chunk in chunks]


@router.post("/{source_id}/resync", response_model=SourceSyncRunRead, status_code=status.HTTP_202_ACCEPTED)
def resync_source(
    source_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SourceSyncRunRead:
    source = db.scalar(
        select(DataSource)
        .options(selectinload(DataSource.documents))
        .where(DataSource.id == source_id, DataSource.user_id == current_user.id)
    )
    if source is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")
    if not source.documents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Source has no document to reindex")

    document = max(source.documents, key=lambda item: item.created_at)
    sync_run = create_resync_run(db=db, source=source, document=document)
    create_audit_log(
        db=db,
        user=current_user,
        action="source_resync_requested",
        entity_type="data_source",
        entity_id=source.id,
        detail=document.original_filename,
    )
    db.commit()
    db.refresh(sync_run)

    return SourceSyncRunRead.model_validate(sync_run)


@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_source(
    source_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    source = db.scalar(
        select(DataSource)
        .options(selectinload(DataSource.documents))
        .where(DataSource.id == source_id, DataSource.user_id == current_user.id)
    )
    if source is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")

    storage_paths = [Path(document.storage_path) for document in source.documents]
    chroma_store.delete_source_chunks(user_id=current_user.id, source_id=source.id)
    db.execute(delete(DataSource).where(DataSource.id == source.id))
    create_audit_log(
        db=db,
        user=current_user,
        action="source_deleted",
        entity_type="data_source",
        entity_id=source.id,
        detail=source.name,
    )
    db.commit()

    for storage_path in storage_paths:
        try:
            storage_path.unlink(missing_ok=True)
        except OSError:
            pass
