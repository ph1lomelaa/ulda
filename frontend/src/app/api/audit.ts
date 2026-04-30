export type AuditLog = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  detail: string | null;
  created_at: string;
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

export async function listAuditLogs(
  accessToken: string,
  params?: { entityType?: string; entityId?: string; limit?: number },
): Promise<AuditLog[]> {
  const search = new URLSearchParams();
  if (params?.entityType) search.set("entity_type", params.entityType);
  if (params?.entityId) search.set("entity_id", params.entityId);
  if (params?.limit) search.set("limit", String(params.limit));

  const query = search.toString();
  const response = await fetch(`${API_BASE_URL}/audit${query ? `?${query}` : ""}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return parseResponse<AuditLog[]>(response);
}
