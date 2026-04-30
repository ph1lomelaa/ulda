import { useEffect, useMemo, useState } from "react";
import { Search, CheckCircle2, XCircle, Zap, Database, FolderOpen, Cpu } from "lucide-react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { listIntegrationStatuses, type IntegrationStatus } from "../api/system";


const statusIconMap = {
  active: CheckCircle2,
  needs_config: Cpu,
  planned: FolderOpen,
} as const;


export function ConnectedAppsPage() {
  const [apps, setApps] = useState<IntegrationStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadIntegrations() {
      try {
        const data = await listIntegrationStatuses();
        if (!cancelled) {
          setApps(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load integrations");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadIntegrations();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredApps = useMemo(
    () => apps.filter((app) => app.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [apps, searchQuery],
  );

  const connectedCount = apps.filter((app) => app.connected).length;
  const plannedCount = apps.filter((app) => app.status === "planned").length;

  return (
    <div className="max-w-7xl text-white">
      <div className="mb-8">
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Connected Apps</h1>
            <p className="text-white/50 mt-1 text-sm">
              Real integration capability view for the current ULDA build
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2">
              <Database className="w-4 h-4 text-white/70" />
              Backend Capabilities
            </Button>
            <Button variant="outline" className="gap-2">
              <Zap className="w-4 h-4 text-white/50" />
              Retrieval Stack
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white/[0.05] border border-white/15 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight">{connectedCount}</p>
                <p className="text-sm text-white/50">Available Now</p>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.05] border border-white/15 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center">
                <Cpu className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight">{apps.length}</p>
                <p className="text-sm text-white/50">Capability Cards</p>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.05] border border-white/15 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight">{plannedCount}</p>
                <p className="text-sm text-white/50">Planned Next</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="search"
            placeholder="Search integrations..."
            className="pl-9 h-10 px-3 w-full rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:border-white/30 focus:bg-white/[0.15] focus:outline-none focus:ring-2 focus:ring-white/10 transition-colors"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-white/15 bg-white/[0.05] p-8 text-sm text-white/50">Loading integrations...</div>
      ) : error ? (
        <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-8 text-sm text-red-200">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredApps.map((app) => {
            const Icon = statusIconMap[app.status as keyof typeof statusIconMap] ?? FolderOpen;
            return (
              <div
                key={app.id}
                className="bg-white/[0.05] border border-white/15 rounded-xl p-6 hover:bg-white/[0.04] hover:border-white/20 transition-all"
              >
                <div className="flex items-start justify-between mb-4 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center shadow-sm">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white/90">{app.name}</h3>
                      <p className="text-sm text-white/50 mt-0.5">{app.description}</p>
                    </div>
                  </div>

                  <Badge
                    className={
                      app.status === "active"
                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : app.status === "needs_config"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                    }
                  >
                    {app.connected ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                    {app.status}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/50">Connection</span>
                    <span className="font-medium text-white/90">{app.connected ? "Enabled" : "Not enabled"}</span>
                  </div>
                  <div className="pt-3 border-t border-white/15">
                    <p className="text-xs text-white/40 mb-2">Current detail:</p>
                    <div className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80">
                      {app.detail}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
