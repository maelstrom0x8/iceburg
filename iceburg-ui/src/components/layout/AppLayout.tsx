import { Outlet } from "react-router-dom";
import { AppTopBar } from "./AppTopBar";

/**
 * Root layout for all /app/* routes.
 * Uses system color scheme (light/dark) via CSS variables.
 */
export function AppLayout() {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: "var(--color-app-bg)", color: "var(--color-app-text)" }}
    >
      <AppTopBar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
