export type SourceDocument = {
  id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  status: string;
  content_chars: number;
  chunk_count: number;
  created_at: string;
  updated_at: string;
};

export type SourceSyncRun = {
  id: string;
  status: string;
  stage: string;
  progress_percent: number;
  total_chunks: number;
  processed_chunks: number;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

export type SourceSummary = {
  id: string;
  name: string;
  type: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type SourceDetail = SourceSummary & {
  document: SourceDocument;
  latest_sync_run: SourceSyncRun;
};

export type ChunkPreview = {
  id: string;
  chunk_index: number;
  content: string;
  char_count: number;
  created_at: string;
};

export type SourceUploadResponse = {
  source: SourceDetail;
};

export type PostgresSourceCreatePayload = {
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  schema?: string;
  sslmode?: string;
};

export type GoogleSheetsSourceCreatePayload = {
  name: string;
  spreadsheet_id: string;
  sheet_gid?: string;
  sheet_name?: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = "Request failed";
    try {
      const payload = await response.json();
      detail = payload.detail ?? detail;
    } catch {
      // Keep fallback message.
    }
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

function authHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function listSources(accessToken: string): Promise<SourceSummary[]> {
  const response = await fetch(`${API_BASE_URL}/sources`, {
    method: "GET",
    credentials: "include",
    headers: authHeaders(accessToken),
  });
  return parseResponse<SourceSummary[]>(response);
}

export async function getSource(accessToken: string, sourceId: string): Promise<SourceDetail> {
  const response = await fetch(`${API_BASE_URL}/sources/${sourceId}`, {
    method: "GET",
    credentials: "include",
    headers: authHeaders(accessToken),
  });
  return parseResponse<SourceDetail>(response);
}

export async function getSourceSyncRun(
  accessToken: string,
  sourceId: string,
  syncRunId: string,
): Promise<SourceSyncRun> {
  const response = await fetch(`${API_BASE_URL}/sources/${sourceId}/sync-runs/${syncRunId}`, {
    method: "GET",
    credentials: "include",
    headers: authHeaders(accessToken),
  });
  return parseResponse<SourceSyncRun>(response);
}

export async function uploadSourceDocument(
  accessToken: string,
  payload: { file: File; name?: string },
): Promise<SourceUploadResponse> {
  const formData = new FormData();
  formData.append("file", payload.file);
  if (payload.name?.trim()) {
    formData.append("name", payload.name.trim());
  }

  const response = await fetch(`${API_BASE_URL}/sources/uploads`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(accessToken),
    body: formData,
  });
  return parseResponse<SourceUploadResponse>(response);
}

export async function getSourceChunks(accessToken: string, sourceId: string, limit = 5): Promise<ChunkPreview[]> {
  const response = await fetch(`${API_BASE_URL}/sources/${sourceId}/chunks?limit=${limit}`, {
    method: "GET",
    credentials: "include",
    headers: authHeaders(accessToken),
  });
  return parseResponse<ChunkPreview[]>(response);
}

export async function resyncSource(accessToken: string, sourceId: string): Promise<SourceSyncRun> {
  const response = await fetch(`${API_BASE_URL}/sources/${sourceId}/resync`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(accessToken),
  });
  return parseResponse<SourceSyncRun>(response);
}

export async function deleteSource(accessToken: string, sourceId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/sources/${sourceId}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    throw new Error("Failed to delete source");
  }
}

export async function createPostgresSource(
  accessToken: string,
  payload: PostgresSourceCreatePayload,
): Promise<SourceUploadResponse> {
  const response = await fetch(`${API_BASE_URL}/sources/postgres`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...authHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return parseResponse<SourceUploadResponse>(response);
}

export async function createGoogleSheetsSource(
  accessToken: string,
  payload: GoogleSheetsSourceCreatePayload,
): Promise<SourceUploadResponse> {
  const response = await fetch(`${API_BASE_URL}/sources/google-sheets`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...authHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return parseResponse<SourceUploadResponse>(response);
}
