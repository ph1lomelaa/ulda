import { Database, MessageSquare, Activity, CheckCircle2, TrendingUp, Clock } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const stats = [
  { label: "Connected Sources", value: "12", change: "+2 this week", icon: Database },
  { label: "Total Queries", value: "1,847", change: "+156 today", icon: MessageSquare },
  { label: "Active Conversations", value: "23", change: "5 ongoing", icon: Activity },
  { label: "Last Sync Status", value: "Success", change: "2 min ago", icon: CheckCircle2 },
];

const chartData = [
  { date: "Mon", queries: 240 },
  { date: "Tue", queries: 310 },
  { date: "Wed", queries: 285 },
  { date: "Thu", queries: 420 },
  { date: "Fri", queries: 390 },
  { date: "Sat", queries: 180 },
  { date: "Sun", queries: 165 },
];

const recentActivity = [
  { user: "Sarah Chen", action: "queried Sales Database", time: "2 min ago", type: "query" },
  { user: "Michael Torres", action: "connected Google Sheets", time: "15 min ago", type: "connect" },
  { user: "Emma Wilson", action: "exported Q1 Analysis", time: "1 hour ago", type: "export" },
  { user: "James Park", action: "queried Customer Documents", time: "2 hours ago", type: "query" },
  { user: "Lisa Anderson", action: "synced PostgreSQL DB", time: "3 hours ago", type: "sync" },
];

const connectedSources = [
  { name: "Sales Database", type: "PostgreSQL", docs: 1234, status: "active" },
  { name: "Product Specs", type: "PDF", docs: 89, status: "active" },
  { name: "Customer Data", type: "Excel", docs: 456, status: "syncing" },
];

export function DashboardPage() {
  return (
    <div className="max-w-7xl text-white">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-white/50 mt-1 text-sm">Monitor your connected data sources and AI activity</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => {
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

      {/* Usage Chart */}
      <div className="bg-white/[0.05] border border-white/15 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Query Activity</h2>
            <p className="text-sm text-white/50 mt-1">Last 7 days</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-green-500 font-medium">+18% vs last week</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData}>
            <XAxis
              key="x-axis"
              dataKey="date"
              stroke="#ffffff20"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#ffffff50' }}
            />
            <YAxis
              key="y-axis"
              stroke="#ffffff20"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#ffffff50' }}
            />
            <Tooltip
              key="tooltip"
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "8px",
                fontSize: "14px",
                color: "#ffffff",
              }}
            />
            <Line
              key="queries-line"
              type="monotone"
              dataKey="queries"
              stroke="#ffffff"
              strokeWidth={2}
              dot={{ fill: "#ffffff", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white/[0.05] border border-white/15 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold tracking-tight">Recent Activity</h2>
            <Clock className="w-5 h-5 text-white/30" />
          </div>

          <div className="space-y-4">
            {recentActivity.map((activity, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-1.5 h-1.5 rounded-full mt-2 ${
                  activity.type === 'query' ? 'bg-blue-500' :
                  activity.type === 'connect' ? 'bg-green-500' :
                  activity.type === 'sync' ? 'bg-cyan-500' : 'bg-white/30'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/90">
                    <span className="font-medium">{activity.user}</span>{" "}
                    <span className="text-white/50">{activity.action}</span>
                  </p>
                  <p className="text-xs text-white/30 mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Connected Sources Summary */}
        <div className="bg-white/[0.05] border border-white/15 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold tracking-tight">Top Sources</h2>
            <Database className="w-5 h-5 text-white/30" />
          </div>

          <div className="space-y-4">
            {connectedSources.map((source, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white/90">{source.name}</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {source.type} · {source.docs.toLocaleString()} documents
                  </p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  source.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                  source.status === 'syncing' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                  'bg-white/5 text-white/50 border border-white/15'
                }`}>
                  {source.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
