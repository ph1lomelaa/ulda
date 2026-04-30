export type IntegrationStatus = {
  id: string;
  name: string;
  description: string;
  status: string;
  connected: boolean;
  detail: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error("Request failed");
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
