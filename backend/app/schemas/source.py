from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SourceSyncRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: str
    stage: str
    progress_percent: int
    total_chunks: int
    processed_chunks: int
    error_message: str | None
    created_at: datetime
    started_at: datetime | None
    completed_at: datetime | None
    updated_at: datetime


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    original_filename: str
    mime_type: str
    size_bytes: int
    status: str
    content_chars: int
    chunk_count: int
    created_at: datetime
    updated_at: datetime


class ChunkPreviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    chunk_index: int
    content: str
    char_count: int
    created_at: datetime


class DataSourceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    type: str
    status: str
    created_at: datetime
    updated_at: datetime


class DataSourceDetailRead(DataSourceRead):
    document: DocumentRead
    latest_sync_run: SourceSyncRunRead


class SourceUploadResponse(BaseModel):
    source: DataSourceDetailRead


class PostgresSourceCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    host: str = Field(min_length=1, max_length=255)
    port: int = Field(default=5432, ge=1, le=65535)
    database: str = Field(min_length=1, max_length=255)
    username: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=255)
    schema_name: str = Field(default="public", alias="schema", min_length=1, max_length=255)
    sslmode: str = Field(default="prefer", min_length=1, max_length=50)


class GoogleSheetsSourceCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    spreadsheet_id: str = Field(min_length=1, max_length=255)
    sheet_gid: str = Field(default="0", min_length=1, max_length=50)
    sheet_name: str | None = Field(default=None, max_length=255)
