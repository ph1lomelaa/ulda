import { useEffect, useRef, useState } from "react";
import { Button } from "../components/ui/button";
import { Send, Plus, FileText, Database, Table2 } from "lucide-react";

const initialConversations = [
  {
    id: "1",
    title: "Q1 Sales Analysis",
    timestamp: "2 min ago",
    unread: true,
    messages: [
      {
        id: "1",
        type: "user",
        content: "What were our top-selling products in Q1 2026?",
        timestamp: "10:24 AM",
      },
      {
        id: "2",
        type: "assistant",
        content: "Based on the sales database, here are the top 5 products in Q1 2026:\n\n1. Enterprise Cloud Suite - $2.4M revenue (1,234 units)\n2. Analytics Platform Pro - $1.8M revenue (892 units)\n3. Data Integration Tools - $1.2M revenue (2,145 units)\n4. AI Assistant License - $980K revenue (3,456 units)\n5. Security Compliance Pack - $750K revenue (567 units)\n\nThe Enterprise Cloud Suite showed a 34% increase compared to Q4 2025, making it our strongest performer.",
        timestamp: "10:24 AM",
        sources: [
          { name: "Sales Database", type: "PostgreSQL", excerpt: "Q1 2026 revenue by product category..." },
          { name: "Product Catalog", type: "PDF", excerpt: "Enterprise Cloud Suite specifications and pricing..." },
        ],
      },
      {
        id: "3",
        type: "user",
        content: "Can you break down the Enterprise Cloud Suite sales by region?",
        timestamp: "10:26 AM",
      },
      {
        id: "4",
        type: "assistant",
        content: "Here's the regional breakdown for Enterprise Cloud Suite in Q1 2026:\n\n• North America: $1.1M (46% of total)\n• Europe: $820K (34%)\n• Asia-Pacific: $480K (20%)\n\nNorth America remains the strongest market, while APAC shows the fastest quarter-over-quarter growth.",
        timestamp: "10:26 AM",
        sources: [
          { name: "Sales Database", type: "PostgreSQL", excerpt: "Regional sales data for Q1 2026..." },
          { name: "Regional Reports", type: "Excel", excerpt: "Geographic distribution analysis..." },
        ],
      },
    ],
  },
  {
    id: "2",
    title: "Customer Demographics",
    timestamp: "1 hour ago",
    unread: false,
    messages: [
      {
        id: "1",
        type: "assistant",
        content: "Customer concentration is highest in mid-market SaaS and financial services accounts, with Europe growing fastest this quarter.",
        timestamp: "9:10 AM",
      },
    ],
  },
  {
    id: "3",
    title: "Product Inventory Check",
    timestamp: "3 hours ago",
    unread: false,
    messages: [
      {
        id: "1",
        type: "assistant",
        content: "Inventory risk is concentrated in two SKUs with under 14 days of stock remaining.",
        timestamp: "7:42 AM",
      },
    ],
  },
] as const;

export function ChatPage() {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeConversationId, setActiveConversationId] = useState(initialConversations[0].id);
  const [inputMessage, setInputMessage] = useState("");
  const messageViewportRef = useRef<HTMLDivElement>(null);
  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId) ?? conversations[0];

  useEffect(() => {
    const viewport = messageViewportRef.current;
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [activeConversation]);

  const buildTimestamp = () =>
    new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

  const handleSend = () => {
    const content = inputMessage.trim();
    if (!content) return;

    setConversations((current) =>
      current.map((conversation) => {
        if (conversation.id !== activeConversationId) return conversation;

        return {
          ...conversation,
          timestamp: "just now",
          unread: false,
          messages: [
            ...conversation.messages,
            {
              id: `${conversation.id}-${conversation.messages.length + 1}`,
              type: "user",
              content,
              timestamp: buildTimestamp(),
            },
            {
              id: `${conversation.id}-${conversation.messages.length + 2}`,
              type: "assistant",
              content:
                "This is still a frontend demo, but the chat flow is now working correctly: your message stays in the thread, the layout remains anchored, and the response block no longer breaks the composer area.",
              timestamp: buildTimestamp(),
            },
          ],
        };
      }),
    );

    setInputMessage("");
  };

  const handleNewConversation = () => {
    const nextId = String(conversations.length + 1);
    const nextConversation = {
      id: nextId,
      title: `New Conversation ${nextId}`,
      timestamp: "just now",
      unread: false,
      messages: [
        {
          id: `${nextId}-1`,
          type: "assistant",
          content: "Start with a question about your connected sources.",
          timestamp: buildTimestamp(),
        },
      ],
    };

    setConversations((current) => [nextConversation, ...current]);
    setActiveConversationId(nextId);
    setInputMessage("");
  };

  return (
    <div className="max-w-7xl min-h-[calc(100vh-7rem)] text-white">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">AI Assistant</h1>
        <p className="text-white/50 mt-1 text-sm">Query your enterprise data in natural language</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[calc(100vh-12rem)]">
        {/* Conversation History */}
        <div className="lg:col-span-4 xl:col-span-3 bg-white/[0.05] border border-white/15 rounded-xl flex flex-col min-h-[18rem] lg:min-h-0">
          <div className="p-4 border-b border-white/15">
            <Button onClick={handleNewConversation} className="w-full gap-2">
              <Plus className="w-4 h-4" />
              New Conversation
            </Button>
          </div>

          <div className="flex-1 p-2 overflow-y-auto">
            <div className="space-y-1">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                    activeConversation.id === conv.id
                      ? "bg-white/[0.15] text-white border border-white/20"
                      : "hover:bg-white/[0.08] text-white/80 border border-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-medium line-clamp-1 flex-1">{conv.title}</p>
                    {conv.unread && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full mt-1 ml-2"></span>
                    )}
                  </div>
                  <p className="text-xs text-white/50">{conv.timestamp}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Chat */}
        <div className="lg:col-span-8 xl:col-span-9 bg-white/[0.05] border border-white/15 rounded-xl flex flex-col min-h-[32rem] overflow-hidden">
          <div className="p-4 border-b border-white/15">
            <h2 className="font-medium text-white">{activeConversation.title}</h2>
            <p className="text-sm text-white/50 mt-0.5">Started {activeConversation.timestamp}</p>
          </div>

          <div ref={messageViewportRef} className="flex-1 p-4 md:p-6 overflow-y-auto">
            <div className="space-y-6 max-w-3xl">
              {activeConversation.messages.map((message) => (
                <div key={message.id} className={message.type === "user" ? "flex justify-end" : ""}>
                  {message.type === "user" ? (
                    <div className="border border-blue-400/30 bg-blue-500/15 text-blue-50 rounded-xl px-4 py-3 max-w-2xl">
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs text-blue-100/60 mt-2">{message.timestamp}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-white/[0.08] border border-white/20 rounded-xl px-4 py-3">
                        <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </p>
                        <p className="text-xs text-white/50 mt-2">{message.timestamp}</p>
                      </div>

                      {message.sources && message.sources.length > 0 && (
                        <div className="space-y-2 pl-4 border-l-2 border-white/20">
                          <p className="text-xs font-medium text-white/60 uppercase tracking-wide">
                            Sources
                          </p>
                          {message.sources.map((source, i) => (
                            <div
                              key={i}
                              className="bg-white/[0.08] border border-white/20 rounded-lg p-3 hover:bg-white/[0.12] hover:border-white/30 transition-colors"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded bg-white/[0.15] flex items-center justify-center flex-shrink-0">
                                  {source.type === "PostgreSQL" ? (
                                    <Database className="w-4 h-4 text-white/80" />
                                  ) : source.type === "PDF" ? (
                                    <FileText className="w-4 h-4 text-white/80" />
                                  ) : (
                                    <Table2 className="w-4 h-4 text-white/80" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white">{source.name}</p>
                                  <p className="text-xs text-white/60 mt-0.5">
                                    {source.type}
                                  </p>
                                  <p className="text-xs text-white/50 mt-1.5 line-clamp-2">
                                    {source.excerpt}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-white/15 bg-[#0b0b0c]">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Ask anything about your connected enterprise data..."
                className="flex-1 h-10 px-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:border-white/30 focus:bg-white/[0.15] focus:outline-none focus:ring-2 focus:ring-white/10 transition-colors"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <Button onClick={handleSend} className="gap-2 px-4 sm:self-auto">
                <Send className="w-4 h-4" />
                Send
              </Button>
            </div>
            <p className="text-xs text-white/40 mt-2">
              AI responses are generated from your connected data sources
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
