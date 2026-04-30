import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Database, FileText, CheckCircle2, Clock, Table2, Sheet, AlertCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { listAuditLogs, type AuditLog } from "../api/audit";
import { useAuth } from "../auth/AuthProvider";
import {
  deleteSource,
  getSource,
  getSourceChunks,
  getSourceSyncRun,
  resyncSource,
  type ChunkPreview,
  type SourceDetail,
} from "../api/sources";

const sourceIcons = {
  POSTGRESQL: Database,
  PDF: FileText,
  Excel: Table2,
  CSV: Table2,
  GOOGLE_SHEETS: Sheet,
  TXT: FileText,
  JSON: FileText,
  MD: FileText,
} as const;

export function SourceDetailPage() {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const { id } = useParams();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [source, setSource] = useState<SourceDetail | null>(null);
  const [chunks, setChunks] = useState<ChunkPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !id) {
      return;
    }

    let cancelled = false;
    let pollId: number | null = null;

    async function loadSource() {
      try {
        const response = await getSource(accessToken, id);
        const chunkPreview = await getSourceChunks(accessToken, id, 5);
        const logs = await listAuditLogs(accessToken, { entityType: "data_source", entityId: id, limit: 20 });
        if (!cancelled) {
          setSource(response);
          setChunks(chunkPreview);
          setAuditLogs(logs);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load source");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSource();

    pollId = window.setInterval(() => {
      void (async () => {
        try {
          const current = await getSource(accessToken, id);
          if (!cancelled) {
            setSource(current);
          }
          if (current.latest_sync_run.status === "processing" || current.latest_sync_run.status === "queued") {
            const syncRun = await getSourceSyncRun(accessToken, current.id, current.latest_sync_run.id);
            if (!cancelled) {
              setSource((previous) => previous ? { ...previous, latest_sync_run: syncRun } : previous);
            }
          }
        } catch {
          // Ignore polling failures and keep existing UI state.
        }
      })();
    }, 2000);

    return () => {
      cancelled = true;
      if (pollId !== null) {
        window.clearInterval(pollId);
      }
    };
  }, [accessToken, id]);

  const Icon = useMemo(() => {
    if (!source) {
      return FileText;
    }
    return sourceIcons[source.type as keyof typeof sourceIcons] ?? FileText;
  }, [source]);

  if (isLoading) {
    return <div className="rounded-xl border border-white/15 bg-white/[0.05] p-8 text-sm text-white/50">Loading source...</div>;
  }

  if (error || !source) {
    return (
      <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-8 text-sm text-red-200">
        {error ?? "Source not found"}
      </div>
    );
  }

  const syncRun = source.latest_sync_run;
  const isFailed = syncRun.status === "failed";
  const isProcessing = syncRun.status === "processing" || syncRun.status === "queued";
  const documentSizeKb = Math.max(1, Math.round(source.document.size_bytes / 1024));

  async function handleResync() {
    if (!accessToken || !source || isResyncing) {
      return;
    }
    setIsResyncing(true);
    setError(null);
    try {
      const syncRun = await resyncSource(accessToken, source.id);
      setSource((current) => current ? { ...current, status: "queued", latest_sync_run: syncRun } : current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resync source");
    } finally {
      setIsResyncing(false);
    }
  }

  async function handleDelete() {
    if (!accessToken || !source || isDeleting) {
      return;
    }
    setIsDeleting(true);
    setError(null);
    try {
      await deleteSource(accessToken, source.id);
      navigate("/app/sources");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete source");
      setIsDeleting(false);
    }
  }

  return (
    <div className="max-w-5xl text-white">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => navigate("/app/sources")}
          className="mb-4"
        >
          ← Back to Sources
        </Button>

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center">
              <Icon className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{source.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="bg-white/10 text-white/70 border-white/10">
                  {source.type}
                </Badge>
                <Badge
                  className={
                    source.status === "ready"
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : isProcessing
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                  }
                >
                  {source.status === "ready" ? <CheckCircle2 className="w-3 h-3 mr-1" /> : null}
                  {isProcessing ? <Clock className="w-3 h-3 mr-1" /> : null}
                  {isFailed ? <AlertCircle className="w-3 h-3 mr-1" /> : null}
                  {source.status}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => void handleResync()} disabled={isResyncing || isProcessing}>
              {isResyncing ? "Starting..." : "Resync"}
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-red-400/20 text-red-300 hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-200"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Source"}
            </Button>
          </div>
        </div>
      </div>

      {/* Metadata Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/[0.05] border border-white/15 rounded-lg p-4">
          <p className="text-sm text-white/50 mb-1">Chunks</p>
          <p className="text-2xl font-semibold tracking-tight">{source.document.chunk_count.toLocaleString()}</p>
        </div>
        <div className="bg-white/[0.05] border border-white/15 rounded-lg p-4">
          <p className="text-sm text-white/50 mb-1">Size</p>
          <p className="text-2xl font-semibold tracking-tight">{documentSizeKb.toLocaleString()} KB</p>
        </div>
        <div className="bg-white/[0.05] border border-white/15 rounded-lg p-4">
          <p className="text-sm text-white/50 mb-1">Progress</p>
          <p className="text-2xl font-semibold tracking-tight">{syncRun.progress_percent}%</p>
        </div>
        <div className="bg-white/[0.05] border border-white/15 rounded-lg p-4">
          <p className="text-sm text-white/50 mb-1">Characters</p>
          <p className="text-2xl font-semibold tracking-tight">{source.document.content_chars.toLocaleString()}</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white/10 border border-white/20 flex-wrap h-auto justify-start">
          <TabsTrigger value="overview" className="data-[state=active]:border-blue-400/30 data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-50">Overview</TabsTrigger>
          <TabsTrigger value="content" className="data-[state=active]:border-blue-400/30 data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-50">Indexing Status</TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:border-blue-400/30 data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-50">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="bg-white/[0.05] border border-white/15 rounded-lg p-6">
            <h2 className="text-lg font-semibold tracking-tight mb-4">Document Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-white/50 mb-1">Filename</p>
                <p className="text-sm font-medium text-white/90">{source.document.original_filename}</p>
              </div>
              <div>
                <p className="text-sm text-white/50 mb-1">MIME Type</p>
                <p className="text-sm font-medium text-white/90">{source.document.mime_type}</p>
              </div>
              <div>
                <p className="text-sm text-white/50 mb-1">Document Status</p>
                <p className="text-sm font-medium text-white/90">{source.document.status}</p>
              </div>
              <div>
                <p className="text-sm text-white/50 mb-1">Uploaded</p>
                <p className="text-sm font-medium text-white/90">{new Date(source.document.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-white/50 mb-1">Source Created</p>
                <p className="text-sm font-medium text-white/90">{new Date(source.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-white/50 mb-1">Last Updated</p>
                <p className="text-sm font-medium text-white/90">{new Date(source.updated_at).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.05] border border-white/15 rounded-lg p-6">
            <h2 className="text-lg font-semibold tracking-tight mb-4">Sync Status</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-white/15">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-sm font-medium text-white/90">Current stage</p>
                    <p className="text-xs text-white/50">{syncRun.stage.replaceAll("_", " ")}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/15">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-white/90">Chunks processed</p>
                    <p className="text-xs text-white/50">
                      {syncRun.processed_chunks} / {Math.max(syncRun.total_chunks, 1)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="pt-2">
                <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full transition-all ${isFailed ? "bg-red-400" : "bg-blue-400"}`}
                    style={{ width: `${syncRun.progress_percent}%` }}
                  />
                </div>
              </div>
              {syncRun.error_message && (
                <div className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {syncRun.error_message}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <div className="bg-white/[0.05] border border-white/15 rounded-lg p-6">
            <h2 className="text-lg font-semibold tracking-tight mb-4">Indexed Chunk Preview</h2>
            <p className="text-sm text-white/50 mb-4">
              This preview comes from the stored chunk rows in PostgreSQL after parsing and before retrieval queries.
            </p>
            <div className="space-y-3">
              {chunks.length === 0 ? (
                <div className="bg-white/10 border border-white/15 rounded-lg p-4 text-sm text-white/50">
                  Preview unavailable until indexing creates chunk rows.
                </div>
              ) : (
                chunks.map((chunk) => (
                  <div key={chunk.id} className="bg-white/10 border border-white/15 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-white/90">Chunk {chunk.chunk_index}</p>
                      <Badge variant="outline" className="border-white/20 text-white/80">
                        {chunk.char_count} chars
                      </Badge>
                    </div>
                    <p className="text-xs text-white/50 leading-relaxed whitespace-pre-wrap">
                      {chunk.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <div className="bg-white/[0.05] border border-white/15 rounded-lg p-6">
            <h2 className="text-lg font-semibold tracking-tight mb-4">Audit Logs</h2>
            <p className="text-sm text-white/50 mb-4">
              Real backend events for this source: upload, resync requests, completed indexing and failures.
            </p>
            <div className="space-y-3">
              {auditLogs.length === 0 ? (
                <div className="bg-white/10 border border-white/15 rounded-lg p-4 text-sm text-white/50">
                  No audit logs for this source yet.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="bg-white/10 border border-white/15 rounded-lg p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-white/90">{log.action.replaceAll("_", " ")}</p>
                      <Badge variant="outline" className="border-white/20 text-white/80">
                        {new Date(log.created_at).toLocaleString()}
                      </Badge>
                    </div>
                    <p className="text-xs text-white/50 mt-2">{log.detail ?? log.entity_type}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
