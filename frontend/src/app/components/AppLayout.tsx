import { Outlet, Link, useLocation } from "react-router";
import { Database, LayoutDashboard, Folder, MessageSquare, Bell, Search, Zap, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { useAuth } from "../auth/AuthProvider";
import { Button } from "./ui/button";

const navItems = [
  { path: "/app", label: "Dashboard", icon: LayoutDashboard },
  { path: "/app/sources", label: "Data Sources", icon: Folder },
  { path: "/app/chat", label: "AI Assistant", icon: MessageSquare },
  { path: "/app/apps", label: "Connected Apps", icon: Zap },
];

export function AppLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-[#0a0a0a] border-r border-white/10 flex-col">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-white/10">
          <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center">
            <Database className="w-4 h-4 text-black" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white tracking-tight">ULDA</h1>
            <p className="text-xs text-white/40">Data Assistant</p>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.path ||
                (item.path !== "/app" && location.pathname.startsWith(`${item.path}/`));

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-white/50 hover:bg-white/5 hover:text-white/80"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-white/30">
            <p className="font-medium tracking-wide">v2.1.0</p>
            <p className="text-white/20 mt-1">Last sync: 2 min ago</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="h-16 bg-[#0a0a0a] border-b border-white/10 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10 gap-3">
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="search"
                placeholder="Search sources, conversations, documents..."
                className="pl-9 h-9 px-3 w-full rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:border-white/30 focus:bg-white/[0.15] focus:outline-none focus:ring-2 focus:ring-white/10 transition-colors"
              />
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <button className="relative p-2 hover:bg-white/5 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-white/50" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-white rounded-full"></span>
            </button>

            <Button variant="ghost" size="sm" className="gap-2" onClick={() => void logout()}>
              <LogOut className="w-4 h-4" />
              Logout
            </Button>

            <Avatar className="w-8 h-8 border border-white/10">
              <AvatarFallback className="bg-white/10 text-white text-sm">
                {user?.name
                  ?.split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() ?? "JD"}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
