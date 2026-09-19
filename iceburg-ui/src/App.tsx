import { Route, Routes } from "react-router-dom";
import { MarketingLayout } from "./components/layout/MarketingLayout";
import { Home } from "./pages/Home";
import { StatusPage } from "./pages/StatusPage";

function App() {
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
      <Route
        path="/app"
        element={
          <StatusPage
            eyebrow="Iceburg App"
            title="The app is under construction"
            description="The issuer console isn't live yet — check back soon."
          />
        }
      />
    </Routes>
  );
}

export default App;
