import { useEffect, useMemo, useState } from "react";
import { Database, Activity, CheckCircle2, TrendingUp, Clock, AlertCircle, FileText } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { listAuditLogs, type AuditLog } from "../api/audit";
import { useAuth } from "../auth/AuthProvider";
import { listConversations, type Conversation } from "../api/chat";
import { getSource, listSources, type SourceDetail } from "../api/sources";


function relativeTimeLabel(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}


function buildChartData(sources: SourceDetail[]) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const buckets = days.map((date) => ({ date, uploads: 0 }));

  for (const source of sources) {
    const weekday = new Date(source.created_at).getDay();
    const normalizedIndex = (weekday + 6) % 7;
    buckets[normalizedIndex].uploads += 1;
  }

  return buckets;
}


export function DashboardPage() {
  const { accessToken } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [sources, setSources] = useState<SourceDetail[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let cancelled = false;
    let pollId: number | null = null;

    async function loadDashboard() {
      try {
        const summaries = await listSources(accessToken);
        const details = await Promise.all(summaries.map((source) => getSource(accessToken, source.id)));
        const chatConversations = await listConversations(accessToken);
        const logs = await listAuditLogs(accessToken, { limit: 8 });
        if (!cancelled) {
          setAuditLogs(logs);
          setSources(details);
          setConversations(chatConversations);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    pollId = window.setInterval(() => {
      void loadDashboard();
    }, 4000);

    return () => {
      cancelled = true;
      if (pollId !== null) {
        window.clearInterval(pollId);
      }
    };
  }, [accessToken]);

  const stats = useMemo(() => {
    const totalSources = sources.length;
    const readySources = sources.filter((source) => source.status === "ready").length;
    const indexingSources = sources.filter((source) => source.status === "processing" || source.status === "queued").length;
    const failedSources = sources.filter((source) => source.status === "failed").length;
    const totalChunks = sources.reduce((sum, source) => sum + source.document.chunk_count, 0);
    const totalFiles = sources.length;
    const totalSizeBytes = sources.reduce((sum, source) => sum + source.document.size_bytes, 0);
    const lastUpdated = sources
      .map((source) => source.latest_sync_run.updated_at)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

    return {
      totalSources,
      readySources,
      indexingSources,
      failedSources,
      totalConversations: conversations.length,
      totalChunks,
      totalFiles,
      totalSizeMb: (totalSizeBytes / (1024 * 1024)).toFixed(1),
      lastUpdated,
    };
  }, [conversations.length, sources]);

  const chartData = useMemo(() => buildChartData(sources), [sources]);

  const recentActivity = useMemo(
    () => auditLogs.slice(0, 5),
    [auditLogs],
  );

  const topSources = useMemo(
    () => [...sources].sort((left, right) => right.document.chunk_count - left.document.chunk_count).slice(0, 3),
    [sources],
  );

  const statCards = [
    {
      label: "Connected Sources",
      value: stats.totalSources.toLocaleString(),
      change: `${stats.readySources} ready`,
      icon: Database,
    },
    {
      label: "Indexed Chunks",
      value: stats.totalChunks.toLocaleString(),
      change: `${stats.totalFiles} files uploaded`,
      icon: FileText,
    },
    {
      label: "Active Indexing Jobs",
      value: stats.totalConversations.toLocaleString(),
      change: stats.indexingSources > 0 ? `${stats.indexingSources} indexing now` : "chat is ready",
      icon: Activity,
    },
    {
      label: "Last Sync Status",
      value: stats.failedSources > 0 ? "Attention" : "Healthy",
      change: stats.lastUpdated ? relativeTimeLabel(stats.lastUpdated) : "no uploads yet",
      icon: stats.failedSources > 0 ? AlertCircle : CheckCircle2,
    },
  ];

  if (isLoading) {
    return <div className="rounded-xl border border-white/15 bg-white/[0.05] p-8 text-sm text-white/50">Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-8 text-sm text-red-200">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-7xl text-white">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-white/50 mt-1 text-sm">Monitor your connected data sources and indexing activity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white/[0.05] border border-white/15 rounded-xl p-5 hover:bg-white/[0.08] transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-white/70" />
                </div>
              </div>
              <p className="text-2xl font-semibold tracking-tight mb-1">{stat.value}</p>
              <p className="text-sm text-white/50 mb-1">{stat.label}</p>
              <p className="text-xs text-white/30">{stat.change}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white/[0.05] border border-white/15 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Upload Activity</h2>
            <p className="text-sm text-white/50 mt-1">Sources created this week</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-green-500 font-medium">{stats.totalSizeMb} MB indexed</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData}>
            <XAxis
              dataKey="date"
              stroke="#ffffff20"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#ffffff50" }}
            />
            <YAxis
              stroke="#ffffff20"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tick={{ fill: "#ffffff50" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "8px",
                fontSize: "14px",
                color: "#ffffff",
              }}
            />
            <Line
              type="monotone"
              dataKey="uploads"
              stroke="#ffffff"
              strokeWidth={2}
              dot={{ fill: "#ffffff", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/[0.05] border border-white/15 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold tracking-tight">Recent Activity</h2>
            <Clock className="w-5 h-5 text-white/30" />
          </div>

          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-white/50">No uploads yet.</p>
            ) : (
              recentActivity.map((log) => (
                <div key={log.id} className="flex items-start gap-3">
                  <div
                    className={`w-1.5 h-1.5 rounded-full mt-2 ${
                      log.action.includes("failed")
                        ? "bg-red-500"
                        : log.action.includes("completed") || log.action.includes("uploaded")
                        ? "bg-green-500"
                        : "bg-blue-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/90">
                      <span className="font-medium">{log.action.replaceAll("_", " ")}</span>{" "}
                      <span className="text-white/50">{log.detail ?? log.entity_type}</span>
                    </p>
                    <p className="text-xs text-white/30 mt-0.5">
                      {relativeTimeLabel(log.created_at)} · {log.entity_type}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white/[0.05] border border-white/15 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold tracking-tight">Top Sources</h2>
            <Database className="w-5 h-5 text-white/30" />
          </div>

          <div className="space-y-4">
            {topSources.length === 0 ? (
              <p className="text-sm text-white/50">No indexed sources yet.</p>
            ) : (
              topSources.map((source) => (
                <div key={source.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white/90">{source.name}</p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {source.type} · {source.document.chunk_count.toLocaleString()} chunks
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      source.status === "ready"
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : source.status === "failed"
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    }`}
                  >
                    {source.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
