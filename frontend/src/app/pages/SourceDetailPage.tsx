import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Database, FileText, RefreshCw, Settings, CheckCircle2, Users, Clock, Table2, Sheet } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { accessUsers, auditLogs, sources } from "../data/mockData";

const sourceIcons = {
  PostgreSQL: Database,
  PDF: FileText,
  Excel: Table2,
  CSV: Table2,
  "Google Sheets": Sheet,
} as const;

export function SourceDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const source = sources.find((item) => item.id === id) ?? sources[0];
  const Icon = sourceIcons[source.type];

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
                    source.status === "connected"
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : source.status === "syncing"
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                  }
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {source.status}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Resync
            </Button>
            <Button className="gap-2">
              <Settings className="w-4 h-4" />
              Edit Source
            </Button>
          </div>
        </div>
      </div>

      {/* Metadata Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/[0.05] border border-white/15 rounded-lg p-4">
          <p className="text-sm text-white/50 mb-1">Documents</p>
          <p className="text-2xl font-semibold tracking-tight">{source.documents.toLocaleString()}</p>
        </div>
        <div className="bg-white/[0.05] border border-white/15 rounded-lg p-4">
          <p className="text-sm text-white/50 mb-1">Size</p>
          <p className="text-2xl font-semibold tracking-tight">{source.size}</p>
        </div>
        <div className="bg-white/[0.05] border border-white/15 rounded-lg p-4">
          <p className="text-sm text-white/50 mb-1">Last Sync</p>
          <p className="text-2xl font-semibold tracking-tight">{source.lastSync}</p>
        </div>
        <div className="bg-white/[0.05] border border-white/15 rounded-lg p-4">
          <p className="text-sm text-white/50 mb-1">Queries</p>
          <p className="text-2xl font-semibold tracking-tight">{source.queries}</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white/10 border border-white/20 flex-wrap h-auto justify-start">
          <TabsTrigger value="overview" className="data-[state=active]:border-blue-400/30 data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-50">Overview</TabsTrigger>
          <TabsTrigger value="content" className="data-[state=active]:border-blue-400/30 data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-50">Content Preview</TabsTrigger>
          <TabsTrigger value="access" className="data-[state=active]:border-blue-400/30 data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-50">Access Control</TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:border-blue-400/30 data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-50">Settings</TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:border-blue-400/30 data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-50">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="bg-white/[0.05] border border-white/15 rounded-lg p-6">
            <h2 className="text-lg font-semibold tracking-tight mb-4">Connection Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-white/50 mb-1">Host</p>
                <p className="text-sm font-medium text-white/90">{source.host}</p>
              </div>
              <div>
                <p className="text-sm text-white/50 mb-1">Port</p>
                <p className="text-sm font-medium text-white/90">{source.port}</p>
              </div>
              <div>
                <p className="text-sm text-white/50 mb-1">Database</p>
                <p className="text-sm font-medium text-white/90">{source.database}</p>
              </div>
              <div>
                <p className="text-sm text-white/50 mb-1">Schema</p>
                <p className="text-sm font-medium text-white/90">{source.schema}</p>
              </div>
              <div>
                <p className="text-sm text-white/50 mb-1">Connected Since</p>
                <p className="text-sm font-medium text-white/90">{source.connectedSince}</p>
              </div>
              <div>
                <p className="text-sm text-white/50 mb-1">Sync Frequency</p>
                <p className="text-sm font-medium text-white/90">{source.syncFrequency}</p>
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
                    <p className="text-sm font-medium text-white/90">Last sync successful</p>
                    <p className="text-xs text-white/50">{source.lastSync} · {source.documents.toLocaleString()} documents indexed</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/15">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-white/90">Next sync scheduled</p>
                    <p className="text-xs text-white/50">In 13 minutes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <div className="bg-white/[0.05] border border-white/15 rounded-lg p-6">
            <h2 className="text-lg font-semibold tracking-tight mb-4">Parsed Content Preview</h2>
            <p className="text-sm text-white/50 mb-4">
              Sample of indexed data chunks from this source
            </p>
            <div className="space-y-3">
              {source.preview.length > 0 ? source.preview.map((item, i) => (
                <div key={i} className="bg-white/10 border border-white/15 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-white/50" />
                      <p className="text-sm font-medium text-white/90">{item.table}</p>
                    </div>
                    <Badge variant="outline" className="border-white/20 text-white/80">{item.records.toLocaleString()} records</Badge>
                  </div>
                  <p className="text-xs text-white/50 font-mono">{item.excerpt}</p>
                </div>
              )) : (
                <div className="bg-white/10 border border-white/15 rounded-lg p-4 text-sm text-white/50">
                  Preview unavailable until the source sync completes successfully.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="access" className="space-y-4">
          <div className="bg-white/[0.05] border border-white/15 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold tracking-tight">Access Control</h2>
              <Button variant="outline" className="gap-2">
                <Users className="w-4 h-4" />
                Add User
              </Button>
            </div>
            <p className="text-sm text-white/50 mb-4">
              Manage who can access and query this data source
            </p>

            <div className="space-y-3">
              {accessUsers.map((user, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-white/15 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center text-blue-400 text-sm font-medium">
                      {user.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/90">{user.name}</p>
                      <p className="text-xs text-white/50">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-white/20 text-white/80">{user.role}</Badge>
                    <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">Remove</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="bg-white/[0.05] border border-white/15 rounded-lg p-6">
            <h2 className="text-lg font-semibold tracking-tight mb-4">Source Settings</h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="source-name" className="text-white">Source Name</Label>
                <input
                  id="source-name"
                  type="text"
                  defaultValue={source.name}
                  className="mt-1.5 h-10 px-3 w-full rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:border-white/30 focus:bg-white/[0.15] focus:outline-none focus:ring-2 focus:ring-white/10 transition-colors"
                />
              </div>

              <div>
                <Label htmlFor="sync-frequency" className="text-white">Sync Frequency</Label>
                <select
                  id="sync-frequency"
                  className="mt-1.5 w-full h-10 px-3 rounded-lg border border-white/20 bg-white/10 text-white text-sm focus:border-white/30 focus:bg-white/[0.15]"
                  defaultValue="15"
                >
                  <option value="5" className="bg-[#0a0a0a]">Every 5 minutes</option>
                  <option value="15" className="bg-[#0a0a0a]">Every 15 minutes</option>
                  <option value="30" className="bg-[#0a0a0a]">Every 30 minutes</option>
                  <option value="60" className="bg-[#0a0a0a]">Every hour</option>
                </select>
              </div>

              <div>
                <Label htmlFor="ai-prompt" className="text-white">Organization Prompt Customization</Label>
                <Textarea
                  id="ai-prompt"
                  className="mt-1.5 min-h-24 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/30 focus:bg-white/[0.15]"
                  placeholder="Add custom instructions for how the AI should interpret and present data from this source..."
                  defaultValue={source.prompt}
                />
                <p className="text-xs text-white/40 mt-1.5">
                  Customize how ULDA interprets and presents data from this source
                </p>
              </div>

              <Button className="gap-2">
                <Settings className="w-4 h-4" />
                Save Settings
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <div className="bg-white/[0.05] border border-white/15 rounded-lg p-6">
            <h2 className="text-lg font-semibold tracking-tight mb-4">Audit Logs</h2>
            <p className="text-sm text-white/50 mb-4">
              Activity history for this data source
            </p>

            <div className="space-y-3">
              {auditLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-white/15 last:border-0">
                  <div className={`w-1.5 h-1.5 rounded-full mt-2 ${
                    log.status === "success" ? "bg-green-400" :
                    log.status === "error" ? "bg-red-400" :
                    "bg-blue-400"
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm text-white/90">{log.action}</p>
                    <p className="text-xs text-white/50 mt-0.5">
                      {log.user} · {log.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
