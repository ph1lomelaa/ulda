import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../components/ui/button";
import { Database, FileText, Table2, Sheet, Search, Upload, CheckCircle2, Clock, XCircle, ChevronDown } from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "../auth/AuthProvider";
import {
  createGoogleSheetsSource,
  createPostgresSource,
  getSource,
  getSourceSyncRun,
  listSources,
  uploadSourceDocument,
  type SourceDetail,
} from "../api/sources";

const sourceTypes = [
  { id: "all", label: "All Sources" },
  { id: "pdf", label: "PDF" },
  { id: "csv", label: "CSV" },
  { id: "txt", label: "Text" },
  { id: "json", label: "JSON" },
  { id: "md", label: "Markdown" },
  { id: "postgresql", label: "PostgreSQL" },
  { id: "google_sheets", label: "Google Sheets" },
];

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

export function DataSourcesPage() {
  const { accessToken } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [sources, setSources] = useState<SourceDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isConnectingPostgres, setIsConnectingPostgres] = useState(false);
  const [isConnectingGoogleSheets, setIsConnectingGoogleSheets] = useState(false);
  const [showPostgresForm, setShowPostgresForm] = useState(false);
  const [showGoogleSheetsForm, setShowGoogleSheetsForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postgresForm, setPostgresForm] = useState({
    name: "",
    host: "",
    port: "5432",
    database: "",
    username: "",
    password: "",
    schema: "public",
    sslmode: "prefer",
  });
  const [googleSheetsForm, setGoogleSheetsForm] = useState({
    name: "",
    spreadsheetId: "",
    sheetGid: "0",
    sheetName: "",
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let cancelled = false;
    let pollId: number | null = null;

    async function loadSources() {
      try {
        const summaries = await listSources(accessToken);
        const details = await Promise.all(summaries.map((source) => getSource(accessToken, source.id)));
        if (!cancelled) {
          setSources(details);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load sources");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSources();

    pollId = window.setInterval(() => {
      void (async () => {
        try {
          const summaries = await listSources(accessToken);
          if (!summaries.some((source) => source.status === "processing" || source.status === "queued")) {
            return;
          }
          const details = await Promise.all(summaries.map((source) => getSource(accessToken, source.id)));
          if (!cancelled) {
            setSources(details);
          }
        } catch {
          // Ignore background polling failures and keep the latest UI state.
        }
      })();
    }, 2500);

    return () => {
      cancelled = true;
      if (pollId !== null) {
        window.clearInterval(pollId);
      }
    };
  }, [accessToken]);

  const filteredSources = useMemo(() => sources.filter((source) => {
    const matchesSearch = source.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || source.type.toLowerCase().includes(selectedType.toLowerCase());
    return matchesSearch && matchesType;
  }), [searchQuery, selectedType, sources]);

  async function refreshSourceStatus(sourceId: string, syncRunId: string) {
    if (!accessToken) {
      return;
    }

    const maxAttempts = 120;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const syncRun = await getSourceSyncRun(accessToken, sourceId, syncRunId);
      const sourceDetail = await getSource(accessToken, sourceId);
      setSources((current) => {
        const next = current.filter((item) => item.id !== sourceId);
        return [sourceDetail, ...next];
      });

      if (syncRun.status === "completed" || syncRun.status === "failed") {
        return;
      }

      await new Promise((resolve) => window.setTimeout(resolve, 1500));
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !accessToken) {
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const response = await uploadSourceDocument(accessToken, { file });
      setSources((current) => [response.source, ...current.filter((item) => item.id !== response.source.id)]);
      void refreshSourceStatus(response.source.id, response.source.latest_sync_run.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function handlePostgresSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) {
      return;
    }

    setIsConnectingPostgres(true);
    setError(null);

    try {
      const response = await createPostgresSource(accessToken, {
        name: postgresForm.name.trim(),
        host: postgresForm.host.trim(),
        port: Number(postgresForm.port),
        database: postgresForm.database.trim(),
        username: postgresForm.username.trim(),
        password: postgresForm.password,
        schema: postgresForm.schema.trim() || "public",
        sslmode: postgresForm.sslmode.trim() || "prefer",
      });
      setSources((current) => [response.source, ...current.filter((item) => item.id !== response.source.id)]);
      void refreshSourceStatus(response.source.id, response.source.latest_sync_run.id);
      setPostgresForm({
        name: "",
        host: "",
        port: "5432",
        database: "",
        username: "",
        password: "",
        schema: "public",
        sslmode: "prefer",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect PostgreSQL source");
    } finally {
      setIsConnectingPostgres(false);
    }
  }

  async function handleGoogleSheetsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) {
      return;
    }

    setIsConnectingGoogleSheets(true);
    setError(null);

    try {
      const response = await createGoogleSheetsSource(accessToken, {
        name: googleSheetsForm.name.trim(),
        spreadsheet_id: googleSheetsForm.spreadsheetId.trim(),
        sheet_gid: googleSheetsForm.sheetGid.trim() || "0",
        sheet_name: googleSheetsForm.sheetName.trim() || undefined,
      });
      setSources((current) => [response.source, ...current.filter((item) => item.id !== response.source.id)]);
      void refreshSourceStatus(response.source.id, response.source.latest_sync_run.id);
      setGoogleSheetsForm({
        name: "",
        spreadsheetId: "",
        sheetGid: "0",
        sheetName: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect Google Sheets source");
    } finally {
      setIsConnectingGoogleSheets(false);
    }
  }

  function formatSourceStatus(status: string) {
    if (status === "ready") return "ready";
    if (status === "processing" || status === "queued") return "indexing";
    if (status === "failed") return "failed";
    return status;
  }

  function getSourceIcon(type: string) {
    return sourceIcons[type as keyof typeof sourceIcons] ?? FileText;
  }

  return (
    <div className="max-w-7xl text-white">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Data Sources</h1>
            <p className="text-white/50 mt-1 text-sm">Manage and monitor your connected data sources</p>
          </div>
          <Button className="gap-2" onClick={openFilePicker} disabled={isUploading}>
            <Upload className="w-4 h-4" />
            {isUploading ? "Uploading..." : "Upload Source"}
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.csv,.txt,.md,.json"
          onChange={handleFileChange}
        />

        <button
          type="button"
          onClick={openFilePicker}
          className="w-full bg-white/[0.05] border-2 border-dashed border-white/10 rounded-xl p-8 mb-6 hover:bg-white/[0.04] hover:border-white/20 transition-colors"
          disabled={isUploading}
        >
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-3">
              <Upload className="w-6 h-6 text-white/70" />
            </div>
            <h3 className="text-lg font-medium mb-1 tracking-tight">Upload Documents</h3>
            <p className="text-sm text-white/40 mb-4">
              {isUploading ? "Uploading file to the server..." : "Choose a file and ULDA will keep indexing it in the background"}
            </p>
            <div className="inline-flex items-center rounded-lg border border-white/20 px-4 py-2 text-sm text-white/90">
              <Upload className="w-4 h-4" />
              <span className="ml-2">{isUploading ? "Uploading..." : "Choose File"}</span>
            </div>
            <p className="text-xs text-white/30 mt-3">Supports PDF, CSV, TXT, MD and JSON</p>
          </div>
        </button>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
          <div className="bg-white/[0.05] border border-white/15 rounded-xl p-4">
            <button
              type="button"
              onClick={() => setShowPostgresForm((current) => !current)}
              className="w-full flex items-start justify-between gap-4 text-left"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                  <Database className="w-4 h-4 text-white/70" />
                </div>
                <div>
                  <h3 className="text-base font-medium tracking-tight">Connect PostgreSQL</h3>
                  <p className="text-xs text-white/40 mt-1">
                    Snapshot schema and sample rows into indexed chunks.
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${showPostgresForm ? "rotate-180" : ""}`} />
            </button>

            {showPostgresForm && (
              <form onSubmit={handlePostgresSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 border-t border-white/10 pt-4">
            <input
              type="text"
              placeholder="Source name"
              className="h-9 px-3 rounded-lg bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/40"
              value={postgresForm.name}
              onChange={(event) => setPostgresForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
            <input
              type="text"
              placeholder="Host"
              className="h-9 px-3 rounded-lg bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/40"
              value={postgresForm.host}
              onChange={(event) => setPostgresForm((current) => ({ ...current, host: event.target.value }))}
              required
            />
            <input
              type="number"
              placeholder="Port"
              className="h-9 px-3 rounded-lg bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/40"
              value={postgresForm.port}
              onChange={(event) => setPostgresForm((current) => ({ ...current, port: event.target.value }))}
              required
            />
            <input
              type="text"
              placeholder="Database"
              className="h-9 px-3 rounded-lg bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/40"
              value={postgresForm.database}
              onChange={(event) => setPostgresForm((current) => ({ ...current, database: event.target.value }))}
              required
            />
            <input
              type="text"
              placeholder="Username"
              className="h-9 px-3 rounded-lg bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/40"
              value={postgresForm.username}
              onChange={(event) => setPostgresForm((current) => ({ ...current, username: event.target.value }))}
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="h-9 px-3 rounded-lg bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/40"
              value={postgresForm.password}
              onChange={(event) => setPostgresForm((current) => ({ ...current, password: event.target.value }))}
              required
            />
            <input
              type="text"
              placeholder="Schema"
              className="h-9 px-3 rounded-lg bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/40"
              value={postgresForm.schema}
              onChange={(event) => setPostgresForm((current) => ({ ...current, schema: event.target.value }))}
            />
            <input
              type="text"
              placeholder="sslmode"
              className="h-9 px-3 rounded-lg bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/40"
              value={postgresForm.sslmode}
              onChange={(event) => setPostgresForm((current) => ({ ...current, sslmode: event.target.value }))}
            />
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" size="sm" className="gap-2" disabled={isConnectingPostgres}>
                <Database className="w-4 h-4" />
                {isConnectingPostgres ? "Connecting..." : "Connect PostgreSQL"}
              </Button>
            </div>
              </form>
            )}
          </div>

          <div className="bg-white/[0.05] border border-white/15 rounded-xl p-4">
            <button
              type="button"
              onClick={() => setShowGoogleSheetsForm((current) => !current)}
              className="w-full flex items-start justify-between gap-4 text-left"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                  <Sheet className="w-4 h-4 text-white/70" />
                </div>
                <div>
                  <h3 className="text-base font-medium tracking-tight">Connect Google Sheets</h3>
                  <p className="text-xs text-white/40 mt-1">
                    Index a public sheet through its CSV export.
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${showGoogleSheetsForm ? "rotate-180" : ""}`} />
            </button>

            {showGoogleSheetsForm && (
              <form onSubmit={handleGoogleSheetsSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 border-t border-white/10 pt-4">
            <input
              type="text"
              placeholder="Source name"
              className="h-9 px-3 rounded-lg bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/40"
              value={googleSheetsForm.name}
              onChange={(event) => setGoogleSheetsForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
            <input
              type="text"
              placeholder="Spreadsheet ID"
              className="h-9 px-3 rounded-lg bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/40"
              value={googleSheetsForm.spreadsheetId}
              onChange={(event) => setGoogleSheetsForm((current) => ({ ...current, spreadsheetId: event.target.value }))}
              required
            />
            <input
              type="text"
              placeholder="Sheet GID"
              className="h-9 px-3 rounded-lg bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/40"
              value={googleSheetsForm.sheetGid}
              onChange={(event) => setGoogleSheetsForm((current) => ({ ...current, sheetGid: event.target.value }))}
            />
            <input
              type="text"
              placeholder="Sheet name (optional)"
              className="h-9 px-3 rounded-lg bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/40"
              value={googleSheetsForm.sheetName}
              onChange={(event) => setGoogleSheetsForm((current) => ({ ...current, sheetName: event.target.value }))}
            />
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" size="sm" className="gap-2" disabled={isConnectingGoogleSheets}>
                <Sheet className="w-4 h-4" />
                {isConnectingGoogleSheets ? "Connecting..." : "Connect Google Sheets"}
              </Button>
            </div>
              </form>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="search"
              placeholder="Search sources..."
              className="pl-9 h-10 px-3 w-full rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:border-white/30 focus:bg-white/[0.15] focus:outline-none focus:ring-2 focus:ring-white/10 transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {sourceTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  selectedType === type.id
                    ? "border border-blue-400/30 bg-blue-500/15 text-blue-100 shadow-[0_0_0_1px_rgba(59,130,246,0.12)]"
                    : "bg-white/10 text-white hover:bg-white/[0.15] border border-white/20"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sources Grid */}
      {isLoading ? (
        <div className="rounded-xl border border-white/15 bg-white/[0.05] p-8 text-sm text-white/50">
          Loading sources...
        </div>
      ) : filteredSources.length === 0 ? (
        <div className="rounded-xl border border-white/15 bg-white/[0.05] p-8 text-sm text-white/50">
          No sources yet. Upload a document to start indexing data into ChromaDB.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSources.map((source) => {
          const Icon = getSourceIcon(source.type);
          const syncRun = source.latest_sync_run;
          const sourceStatus = formatSourceStatus(source.status);
          return (
            <Link
              key={source.id}
              to={`/app/sources/${source.id}`}
              className="bg-white/[0.05] border border-white/15 rounded-xl p-5 hover:bg-white/[0.04] hover:border-white/20 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-white/70" />
                </div>
              </div>

              <h3 className="font-medium text-white/90 mb-1 line-clamp-1">{source.name}</h3>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-white/60 border border-white/15">
                  {source.type}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                  sourceStatus === "ready" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                  sourceStatus === "indexing" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                  "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}>
                  {sourceStatus === "ready" && <CheckCircle2 className="w-3 h-3" />}
                  {sourceStatus === "indexing" && <Clock className="w-3 h-3" />}
                  {sourceStatus === "failed" && <XCircle className="w-3 h-3" />}
                  {sourceStatus}
                </span>
              </div>

              <div className="space-y-1.5 text-sm text-white/50">
                <div className="flex items-center justify-between">
                  <span>Chunks</span>
                  <span className="font-medium text-white/90">{source.document.chunk_count.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Size</span>
                  <span className="font-medium text-white/90">
                    {Math.max(1, Math.round(source.document.size_bytes / 1024)).toLocaleString()} KB
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Progress</span>
                  <span className="font-medium text-white/90">{syncRun.progress_percent}%</span>
                </div>
              </div>

              <div className="mt-4">
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      syncRun.status === "failed" ? "bg-red-400" : "bg-blue-400"
                    }`}
                    style={{ width: `${syncRun.progress_percent}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-white/35">
                  {syncRun.status === "failed"
                    ? syncRun.error_message ?? "Indexing failed"
                    : `${syncRun.stage.replaceAll("_", " ")} • ${syncRun.processed_chunks}/${Math.max(syncRun.total_chunks, 1)} chunks`}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
      )}
    </div>
  );
}
