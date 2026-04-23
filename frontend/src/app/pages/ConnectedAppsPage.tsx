import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Search, CheckCircle2, XCircle, Calendar, Mail, FolderOpen, Table2, MessageSquare, FileText, Zap } from "lucide-react";
import { useState } from "react";

const apps = [
  {
    id: "notion",
    name: "Notion",
    icon: FileText,
    color: "bg-slate-700",
    description: "Connect your Notion workspaces and databases",
    connected: true,
    synced: "2,345 pages",
    lastSync: "5 min ago",
    permissions: ["Read pages", "Access databases"],
  },
  {
    id: "google-drive",
    name: "Google Drive",
    icon: FolderOpen,
    color: "bg-blue-600",
    description: "Access files and folders from Google Drive",
    connected: true,
    synced: "892 files",
    lastSync: "10 min ago",
    permissions: ["Read files", "View metadata"],
  },
  {
    id: "google-sheets",
    name: "Google Sheets",
    icon: Table2,
    color: "bg-green-600",
    description: "Query data from your spreadsheets",
    connected: true,
    synced: "34 spreadsheets",
    lastSync: "15 min ago",
    permissions: ["Read spreadsheets", "View charts"],
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    icon: Calendar,
    color: "bg-blue-500",
    description: "Access your calendar events and schedules",
    connected: false,
    synced: "—",
    lastSync: "—",
    permissions: ["Read events", "View attendees"],
  },
  {
    id: "gmail",
    name: "Gmail",
    icon: Mail,
    color: "bg-red-600",
    description: "Search and query your email messages",
    connected: false,
    synced: "—",
    lastSync: "—",
    permissions: ["Read emails", "View attachments"],
  },
  {
    id: "slack",
    name: "Slack",
    icon: MessageSquare,
    color: "bg-purple-600",
    description: "Access Slack messages and shared files",
    connected: false,
    synced: "—",
    lastSync: "—",
    permissions: ["Read messages", "Access channels"],
  },
  {
    id: "airtable",
    name: "Airtable",
    icon: Table2,
    color: "bg-amber-600",
    description: "Connect your Airtable bases and tables",
    connected: false,
    synced: "—",
    lastSync: "—",
    permissions: ["Read bases", "Access records"],
  },
];

const quickActions = [
  { icon: Zap, label: "Sync All", color: "text-white/70" },
  { icon: FolderOpen, label: "Browse Files", color: "text-white/50" },
  { icon: Calendar, label: "Recent Activity", color: "text-white/50" },
];

export function ConnectedAppsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredApps = apps.filter((app) =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const connectedCount = apps.filter(app => app.connected).length;

  return (
    <div className="max-w-7xl text-white">
      <div className="mb-8">
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Connected Apps</h1>
            <p className="text-white/50 mt-1 text-sm">
              Integrate your favorite apps to unlock powerful data insights
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {quickActions.map((action, i) => {
              const Icon = action.icon;
              return (
                <Button key={i} variant="outline" className="gap-2">
                  <Icon className={`w-4 h-4 ${action.color}`} />
                  {action.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white/[0.05] border border-white/15 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight">{connectedCount}</p>
                <p className="text-sm text-white/50">Connected Apps</p>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.05] border border-white/15 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight">3,271</p>
                <p className="text-sm text-white/50">Total Items Synced</p>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.05] border border-white/15 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight">Active</p>
                <p className="text-sm text-white/50">Sync Status</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="search"
            placeholder="Search apps..."
            className="pl-9 h-10 px-3 w-full rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:border-white/30 focus:bg-white/[0.15] focus:outline-none focus:ring-2 focus:ring-white/10 transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Apps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredApps.map((app) => {
          const Icon = app.icon;
          return (
            <div
              key={app.id}
              className="bg-white/[0.05] border border-white/15 rounded-xl p-6 hover:bg-white/[0.04] hover:border-white/20 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 ${app.color} rounded-lg flex items-center justify-center shadow-sm`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white/90">{app.name}</h3>
                    <p className="text-sm text-white/50 mt-0.5">{app.description}</p>
                  </div>
                </div>

                {app.connected ? (
                  <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-white/50 border-white/10">
                    <XCircle className="w-3 h-3 mr-1" />
                    Not connected
                  </Badge>
                )}
              </div>

              {app.connected ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/50">Items synced</span>
                    <span className="font-medium text-white/90">{app.synced}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/50">Last sync</span>
                    <span className="font-medium text-white/90">{app.lastSync}</span>
                  </div>

                  <div className="pt-3 border-t border-white/15">
                    <p className="text-xs text-white/40 mb-2">Permissions:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {app.permissions.map((perm, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-white/10 text-white/80 border border-white/20"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3">
                    <Button variant="outline" size="sm" className="flex-1 gap-2">
                      <Zap className="w-3.5 h-3.5" />
                      Sync Now
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 border-red-400/20 text-red-300 hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-200">
                      Disconnect
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="py-3 border-t border-white/15">
                    <p className="text-xs text-white/40 mb-2">Will request permissions:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {app.permissions.map((perm, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-white/10 text-white/80 border border-white/20"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Button className="w-full gap-2">
                    Connect {app.name}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Help Section */}
      <div className="mt-8 bg-white/[0.05] border border-white/15 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white/90 mb-1">Connect more apps</h3>
            <p className="text-sm text-white/50 mb-3">
              ULDA works best when connected to all your data sources. Each integration is encrypted and you can revoke access anytime.
            </p>
            <Button variant="outline" size="sm">
              View All Integrations
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
