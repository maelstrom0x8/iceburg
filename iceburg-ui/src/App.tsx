import { Navigate, Route, Routes } from "react-router-dom";
import { MarketingLayout } from "./components/layout/MarketingLayout";
import { AppLayout } from "./components/layout/AppLayout";
import { Home } from "./pages/Home";
import { StatusPage } from "./pages/StatusPage";
import { IssuancesPage } from "./pages/app/IssuancesPage";
import { IssuanceDetailPage } from "./pages/app/IssuanceDetailPage";
import { ActivityPage } from "./pages/app/ActivityPage";
import { IssuePage } from "./pages/app/IssuePage";
import { ClearingPage } from "./pages/app/ClearingPage";

function App() {
  return (
    <Routes>
      {/* ── Marketing shell ── */}
      <Route element={<MarketingLayout />}>
        <Route path="/" element={<Home />} />
        <Route
          path="/about"
          element={
            <StatusPage
              eyebrow="About"
              title="About Iceburg"
              description="More about our team and mission is coming soon."
            />
          }
        />
        <Route
          path="/faq"
          element={
            <StatusPage
              eyebrow="FAQs"
              title="Frequently asked questions"
              description="Answers to common questions are on the way."
            />
          }
        />
        <Route
          path="/help"
          element={
            <StatusPage
              eyebrow="Help"
              title="Help and support"
              description="Our support center is under construction."
            />
          }
        />
        <Route
          path="*"
          element={
            <StatusPage
              eyebrow="404"
              title="Page not found"
              description="The page you're looking for doesn't exist or has moved."
            />
          }
        />
      </Route>

      {/* ── App shell — entirely independent from marketing layout ── */}
      <Route path="/app" element={<AppLayout />}>
        {/* Default to issuances tab */}
        <Route index element={<Navigate to="/app/issuances" replace />} />
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
