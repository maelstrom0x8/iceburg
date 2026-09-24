import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { IssuancesPage } from "./pages/app/IssuancesPage";
import { IssuanceDetailPage } from "./pages/app/IssuanceDetailPage";
import { ActivityPage } from "./pages/app/ActivityPage";
import { IssuePage } from "./pages/app/IssuePage";
import { ClearingPage } from "./pages/app/ClearingPage";

/**
 * The application — its own build (`app/index.html` via `main.app.tsx`),
 * deployed as its own Vercel project on the `app.` subdomain. Mounted at
 * "/" here (not "/app") since it owns its own origin now; the marketing
 * site links here with an absolute cross-origin URL (src/config/urls.ts),
 * never a React Router <Link>.
 */
function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        {/* Default to issuances tab */}
        <Route index element={<Navigate to="/issuances" replace />} />
        <Route path="issuances" element={<IssuancesPage />} />
        <Route path="issuances/:address" element={<IssuanceDetailPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="issue" element={<IssuePage />} />
        <Route path="clearing" element={<ClearingPage />} />
        <Route
          path="*"
          element={
            <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
              <p className="text-4xl font-bold text-white">404</p>
              <p className="text-[var(--color-app-muted)]">
                This page doesn't exist in the app.
              </p>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
