import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../components/ui/button";
import { Send, Plus, Download, Trash2 } from "lucide-react";

import { useAuth } from "../auth/AuthProvider";
import {
  createConversation,
  deleteConversation,
  exportConversation,
  getConversationMessages,
  listConversations,
  sendMessage,
  type ChatMessage,
  type Conversation,
} from "../api/chat";


function formatTimestamp(dateString: string) {
  return new Date(dateString).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}


function formatRelativeTimestamp(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function trimChunkSuffix(title: string, chunkIndex: string) {
  const suffix = `· chunk ${chunkIndex}`;
  return title.endsWith(suffix) ? title.slice(0, -suffix.length).trim() : title;
}

function buildCitationHeading(sourceName: string, documentTitle: string, chunkIndex: string) {
  const normalizedTitle = trimChunkSuffix(documentTitle, chunkIndex);
  if (normalizedTitle === sourceName) {
    return sourceName;
  }
  return `${sourceName} - ${normalizedTitle}`;
}

export function ChatPage() {
  const { accessToken } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSourceMessageIds, setExpandedSourceMessageIds] = useState<Record<string, boolean>>({});
  const messageViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let cancelled = false;

    async function bootstrapChat() {
      try {
        const existingConversations = await listConversations(accessToken);
        if (!existingConversations.length) {
          const created = await createConversation(accessToken);
          if (!cancelled) {
            setConversations([created]);
            setActiveConversationId(created.id);
            setMessages([]);
          }
          return;
        }

        const firstConversation = existingConversations[0];
        const payload = await getConversationMessages(accessToken, firstConversation.id);
        if (!cancelled) {
          setConversations(existingConversations);
          setActiveConversationId(firstConversation.id);
          setMessages(payload.messages);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load chat");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void bootstrapChat();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    const viewport = messageViewportRef.current;
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [messages, activeConversationId]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [activeConversationId, conversations],
  );

  async function loadConversation(conversationId: string) {
    if (!accessToken) {
      return;
    }

    setActiveConversationId(conversationId);
    try {
      const payload = await getConversationMessages(accessToken, conversationId);
      setMessages(payload.messages);
      setConversations((current) =>
        current.map((conversation) => (conversation.id === conversationId ? payload.conversation : conversation)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversation");
    }
  }

  async function handleNewConversation() {
    if (!accessToken) {
      return;
    }

    try {
      const conversation = await createConversation(accessToken);
      setConversations((current) => [conversation, ...current]);
      setActiveConversationId(conversation.id);
      setMessages([]);
      setInputMessage("");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create conversation");
    }
  }

  async function handleDeleteConversation(conversationId: string) {
    if (!accessToken || deletingConversationId) {
      return;
    }

    const conversation = conversations.find((item) => item.id === conversationId);
    const title = conversation?.title ?? "this conversation";
    const confirmed = window.confirm(`Delete "${title}"? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setDeletingConversationId(conversationId);
    setError(null);

    try {
      await deleteConversation(accessToken, conversationId);

      const remaining = conversations.filter((item) => item.id !== conversationId);
      setConversations(remaining);
      setExpandedSourceMessageIds((current) => {
        if (activeConversationId !== conversationId) {
          return current;
        }
        return {};
      });

      if (activeConversationId === conversationId) {
        if (remaining.length > 0) {
          const nextConversation = remaining[0];
          setActiveConversationId(nextConversation.id);
          const payload = await getConversationMessages(accessToken, nextConversation.id);
          setMessages(payload.messages);
          setConversations((current) =>
            current.map((item) => (item.id === nextConversation.id ? payload.conversation : item)),
          );
        } else {
          const created = await createConversation(accessToken);
          setConversations([created]);
          setActiveConversationId(created.id);
          setMessages([]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete conversation");
    } finally {
      setDeletingConversationId(null);
    }
  }

  async function handleSend() {
    const content = inputMessage.trim();
    if (!content || !accessToken || !activeConversationId || isSending) {
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const reply = await sendMessage(accessToken, activeConversationId, content);
      setMessages((current) => [...current, reply.user_message, reply.assistant_message]);
      setConversations((current) => {
        const remaining = current.filter((conversation) => conversation.id !== reply.conversation.id);
        return [reply.conversation, ...remaining];
      });
      setInputMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  }

  async function handleExport(format: "md" | "txt") {
    if (!accessToken || !activeConversationId) {
      return;
    }

    try {
      const blob = await exportConversation(accessToken, activeConversationId, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `conversation.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export conversation");
    }
  }

  function toggleSources(messageId: string) {
    setExpandedSourceMessageIds((current) => ({
      ...current,
      [messageId]: !current[messageId],
    }));
  }

  if (isLoading) {
    return <div className="rounded-xl border border-white/15 bg-white/[0.05] p-8 text-sm text-white/50">Loading chat...</div>;
  }

  return (
    <div className="max-w-7xl min-h-[calc(100vh-7rem)] text-white">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">AI Assistant</h1>
        <p className="text-white/50 mt-1 text-sm">Query your indexed enterprise data in natural language</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[calc(100vh-12rem)]">
        <div className="lg:col-span-4 xl:col-span-3 bg-white/[0.05] border border-white/15 rounded-xl flex flex-col min-h-[18rem] lg:min-h-0">
          <div className="p-4 border-b border-white/15">
            <Button onClick={handleNewConversation} className="w-full gap-2">
              <Plus className="w-4 h-4" />
              New Conversation
            </Button>
          </div>

          <div className="flex-1 p-2 overflow-y-auto">
            <div className="space-y-1">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`group rounded-lg border transition-colors ${
                    activeConversation?.id === conversation.id
                      ? "bg-white/[0.15] text-white border-white/20"
                      : "text-white/80 border-transparent hover:bg-white/[0.08]"
                  }`}
                >
                  <div className="flex items-start gap-2 px-2 py-2">
                    <button
                      onClick={() => void loadConversation(conversation.id)}
                      className="min-w-0 flex-1 text-left px-1 py-0.5"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-sm font-medium line-clamp-1 flex-1">{conversation.title}</p>
                      </div>
                      <p className="text-xs text-white/50">{formatRelativeTimestamp(conversation.updated_at)}</p>
                      {conversation.last_message_preview && (
                        <p className="text-xs text-white/30 mt-1 line-clamp-2">{conversation.last_message_preview}</p>
                      )}
                    </button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-0.5 size-8 text-white/35 hover:text-red-200 hover:bg-red-500/15"
                      onClick={() => void handleDeleteConversation(conversation.id)}
                      disabled={deletingConversationId === conversation.id}
                      aria-label={`Delete ${conversation.title}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 xl:col-span-9 bg-white/[0.05] border border-white/15 rounded-xl flex flex-col min-h-[32rem] overflow-hidden">
          <div className="p-4 border-b border-white/15 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-medium text-white">{activeConversation?.title ?? "Conversation"}</h2>
              <p className="text-sm text-white/50 mt-0.5">
                {activeConversation ? `Updated ${formatRelativeTimestamp(activeConversation.updated_at)}` : "Start by asking a question"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => void handleExport("md")} disabled={!activeConversationId}>
                <Download className="w-4 h-4 mr-2" />
                Export MD
              </Button>
            </div>
          </div>

          <div ref={messageViewportRef} className="flex-1 p-4 md:p-6 overflow-y-auto">
            <div className="space-y-6 max-w-3xl">
              {messages.length === 0 ? (
                <div className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-5 text-sm text-white/50">
                  Ask about your uploaded documents. Retrieval will search indexed chunks from ChromaDB and return grounded citations.
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={message.role === "user" ? "flex justify-end" : ""}>
                    {message.role === "user" ? (
                      <div className="border border-blue-400/30 bg-blue-500/15 text-blue-50 rounded-xl px-4 py-3 max-w-2xl">
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className="text-xs text-blue-100/60 mt-2">{formatTimestamp(message.created_at)}</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="bg-white/[0.08] border border-white/20 rounded-xl px-4 py-3">
                          <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </p>
                          <p className="text-xs text-white/50 mt-2">{formatTimestamp(message.created_at)}</p>
                        </div>

                        {message.citations.length > 0 && (
                          <div>
                            <button
                              type="button"
                              onClick={() => toggleSources(message.id)}
                              className="text-xs text-white/55 hover:text-white/80 transition-colors"
                            >
                              {expandedSourceMessageIds[message.id] ? "Hide sources" : `Show sources (${message.citations.length})`}
                            </button>

                            {expandedSourceMessageIds[message.id] && (
                              <div className="mt-2 space-y-2 pl-4 border-l-2 border-white/15">
                                {message.citations.map((citation) => (
                                  <div
                                    key={`${message.id}-${citation.document_id}-${citation.chunk_index}`}
                                    className="bg-white/[0.06] border border-white/15 rounded-lg px-3 py-2.5"
                                  >
                                    <p className="text-sm font-medium text-white line-clamp-1">
                                      {buildCitationHeading(citation.source_name, citation.document_title, citation.chunk_index)}
                                    </p>
                                    <p className="text-xs text-white/55 mt-0.5">
                                      chunk {citation.chunk_index}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-4 border-t border-white/15 bg-[#0b0b0c]">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Ask anything about your connected enterprise data..."
                className="flex-1 h-10 px-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:border-white/30 focus:bg-white/[0.15] focus:outline-none focus:ring-2 focus:ring-white/10 transition-colors"
                value={inputMessage}
                onChange={(event) => setInputMessage(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && void handleSend()}
                disabled={isSending || !activeConversationId}
              />
              <Button onClick={() => void handleSend()} className="gap-2 px-4 sm:self-auto" disabled={isSending || !activeConversationId}>
                <Send className="w-4 h-4" />
                {isSending ? "Sending..." : "Send"}
              </Button>
            </div>
            <p className="text-xs text-white/40 mt-2">
              Answers are grounded in indexed chunks and return citations from your uploaded sources
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
