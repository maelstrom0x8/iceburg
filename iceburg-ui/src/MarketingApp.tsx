import { Route, Routes } from "react-router-dom";
import { MarketingLayout } from "./components/layout/MarketingLayout";
import { Home } from "./pages/Home";
import { StatusPage } from "./pages/StatusPage";

/**
 * The marketing site — its own build (`app/index.html` is the app's build,
 * this is the default `index.html` entry via `main.tsx`), deployed as its
 * own Vercel project on the bare domain. Never imports anything from
 * wagmi/viem/RainbowKit or the /app surface — that's the whole point of
 * the split (see src/config/urls.ts for how the two link to each other).
 */
function MarketingApp() {
  return (
    <Routes>
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
    </Routes>
  );
}

export default MarketingApp;
