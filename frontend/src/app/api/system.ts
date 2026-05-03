export type IntegrationStatus = {
  id: string;
  name: string;
  description: string;
  status: string;
  connected: boolean;
  detail: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

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

export async function listIntegrationStatuses(): Promise<IntegrationStatus[]> {
  const response = await fetch(`${API_BASE_URL}/system/integrations`, {
    method: "GET",
    credentials: "include",
  });
  return parseResponse<IntegrationStatus[]>(response);
}
