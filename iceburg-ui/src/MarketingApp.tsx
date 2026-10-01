import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { MarketingLayout } from "./components/layout/MarketingLayout";
import { About } from "./pages/About";
import { Home } from "./pages/Home";
import { StatusPage } from "./pages/StatusPage";
import { hasSeenLanding, markLandingSeen } from "./lib/landingGate";

function LandingGate() {
  const alreadySeen = hasSeenLanding();

  useEffect(() => {
    if (!alreadySeen) markLandingSeen();
  }, [alreadySeen]);

  if (alreadySeen) return <Navigate to="/app" replace />;
  return <Home />;
}

function MarketingApp() {
  return (
    <Routes>
      <Route element={<MarketingLayout />}>
        <Route path="/" element={<LandingGate />} />
        <Route path="/about" element={<About />} />
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
    </Routes>
  );
}

export default MarketingApp;
