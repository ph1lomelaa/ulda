import { createBrowserRouter } from "react-router";
import { LandingPage } from "./pages/LandingPage";
import { LoginPageDark } from "./pages/LoginPageDark";
import { DashboardPage } from "./pages/DashboardPage";
import { DataSourcesPage } from "./pages/DataSourcesPage";
import { ChatPage } from "./pages/ChatPage";
import { SourceDetailPage } from "./pages/SourceDetailPage";
import { ConnectedAppsPage } from "./pages/ConnectedAppsPage";
import { AppLayout } from "./components/AppLayout";
import { RequireAuth } from "./auth/RequireAuth";


function ProtectedAppLayout() {
  return (
    <RequireAuth>
      <AppLayout />
    </RequireAuth>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/login",
    Component: LoginPageDark,
  },
  {
    path: "/app",
    Component: ProtectedAppLayout,
    children: [
      { index: true, Component: DashboardPage },
      { path: "sources", Component: DataSourcesPage },
      { path: "sources/:id", Component: SourceDetailPage },
      { path: "chat", Component: ChatPage },
      { path: "apps", Component: ConnectedAppsPage },
    ],
  },
]);
