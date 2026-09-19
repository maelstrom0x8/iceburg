import { Outlet } from "react-router-dom";
import { AppTopBar } from "./AppTopBar";

/**
 * Root layout for all /app/* routes. Completely independent from
 * MarketingLayout — no shared chrome, different colour palette.
 *
 * The sub-header is rendered by each page via AppSubHeader so it can
 * carry page-specific stats. Pages sit inside the scrollable main area.
 */
export function AppLayout() {
  return (
    <div
      data-theme="app"
      className="flex min-h-screen flex-col"
      style={{ background: "var(--color-app-bg)", color: "#fff" }}
    >
      <AppTopBar />
      {/* Sub-header + page content are rendered by the Outlet (each page
          renders its own AppSubHeader at the top of its tree) */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
