import { Outlet } from "react-router-dom";
import { AppTopBar } from "./AppTopBar";

/**
 * Root layout for all /app/* routes. Completely independent from
 * MarketingLayout — no shared chrome, different colour palette.
 */
export function AppLayout() {
  return (
    <div
      data-theme="app"
      className="flex min-h-screen flex-col bg-app-bg text-white"
    >
      <AppTopBar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
