export type Citation = {
  source_name: string;
  document_title: string;
  excerpt: string;
  source_id: string;
  document_id: string;
  chunk_index: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  created_at: string;
};

export type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_preview: string | null;
};

export type ConversationMessagesResponse = {
  conversation: Conversation;
  messages: ChatMessage[];
};

export type MessageReplyResponse = {
  conversation: Conversation;
  user_message: ChatMessage;
  assistant_message: ChatMessage;
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
    "Content-Type": "application/json",
  };
}

export async function listConversations(accessToken: string): Promise<Conversation[]> {
  const response = await fetch(`${API_BASE_URL}/chat/conversations`, {
    method: "GET",
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return parseResponse<Conversation[]>(response);
}

export async function createConversation(accessToken: string, title = "New Conversation"): Promise<Conversation> {
  const response = await fetch(`${API_BASE_URL}/chat/conversations`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ title }),
  });
  const payload = await parseResponse<{ conversation: Conversation }>(response);
  return payload.conversation;
}

export async function deleteConversation(accessToken: string, conversationId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}`, {
    method: "DELETE",
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error("Failed to delete conversation");
  }
}

export async function getConversationMessages(
  accessToken: string,
  conversationId: string,
): Promise<ConversationMessagesResponse> {
  const response = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/messages`, {
    method: "GET",
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return parseResponse<ConversationMessagesResponse>(response);
}

export async function sendMessage(
  accessToken: string,
  conversationId: string,
  content: string,
): Promise<MessageReplyResponse> {
  const response = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ content }),
  });
  return parseResponse<MessageReplyResponse>(response);
}

export async function exportConversation(
  accessToken: string,
  conversationId: string,
  format: "md" | "txt" = "md",
): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/export?format=${format}`, {
    method: "GET",
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error("Failed to export conversation");
  }
  return response.blob();
}
