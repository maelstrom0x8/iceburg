import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import MarketingApp from "./MarketingApp.tsx";
import { AppLoadingFallback } from "./components/ui/AppLoadingFallback.tsx";

const AppShell = lazy(() => import("./AppShell.tsx"));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route
          path="/app/*"
          element={
            <Suspense fallback={<AppLoadingFallback />}>
              <AppShell />
            </Suspense>
          }
        />
        <Route path="/*" element={<MarketingApp />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
