import { useState } from "react";
import { Button } from "../components/ui/button";
import { Database, FileText, Table2, Sheet, Plus, Search, MoreVertical, Upload, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Link } from "react-router";
import { sources } from "../data/mockData";

const sourceTypes = [
  { id: "all", label: "All Sources" },
  { id: "pdf", label: "PDF" },
  { id: "excel", label: "Excel" },
  { id: "csv", label: "CSV" },
  { id: "sheets", label: "Google Sheets" },
  { id: "postgres", label: "PostgreSQL" },
];

const sourceIcons = {
  PostgreSQL: Database,
  PDF: FileText,
  Excel: Table2,
  CSV: Table2,
  "Google Sheets": Sheet,
} as const;

export function DataSourcesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  const filteredSources = sources.filter((source) => {
    const matchesSearch = source.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || source.type.toLowerCase().includes(selectedType.toLowerCase());
    return matchesSearch && matchesType;
  });

  return (
    <div className="max-w-7xl text-white">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Data Sources</h1>
            <p className="text-white/50 mt-1 text-sm">Manage and monitor your connected data sources</p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Source
          </Button>
        </div>

        {/* Upload Area */}
        <div className="bg-white/[0.05] border-2 border-dashed border-white/10 rounded-xl p-8 mb-6 hover:bg-white/[0.04] hover:border-white/20 transition-colors">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-3">
              <Upload className="w-6 h-6 text-white/70" />
            </div>
            <h3 className="text-lg font-medium mb-1 tracking-tight">Upload Documents</h3>
            <p className="text-sm text-white/40 mb-4">Drag and drop files here, or click to browse</p>
            <Button variant="outline" className="gap-2">
              <Upload className="w-4 h-4" />
              Choose Files
            </Button>
            <p className="text-xs text-white/30 mt-3">Supports PDF, Excel, CSV files up to 100MB</p>
          </div>
        </div>

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSources.map((source) => {
          const Icon = sourceIcons[source.type];
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
                <button className="p-1 hover:bg-white/10 rounded transition-colors opacity-0 group-hover:opacity-100">
                  <MoreVertical className="w-4 h-4 text-white/40" />
                </button>
              </div>

              <h3 className="font-medium text-white/90 mb-1 line-clamp-1">{source.name}</h3>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-white/60 border border-white/15">
                  {source.type}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                  source.status === "connected" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                  source.status === "syncing" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                  "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}>
                  {source.status === "connected" && <CheckCircle2 className="w-3 h-3" />}
                  {source.status === "syncing" && <Clock className="w-3 h-3" />}
                  {source.status === "error" && <XCircle className="w-3 h-3" />}
                  {source.status}
                </span>
              </div>

              <div className="space-y-1.5 text-sm text-white/50">
                <div className="flex items-center justify-between">
                  <span>Documents</span>
                  <span className="font-medium text-white/90">{source.documents.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Size</span>
                  <span className="font-medium text-white/90">{source.size}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Last sync</span>
                  <span className="font-medium text-white/90">{source.lastSync}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
