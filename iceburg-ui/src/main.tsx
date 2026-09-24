import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import MarketingApp from "./MarketingApp.tsx";

// No WagmiProvider/RainbowKitProvider/QueryClientProvider/AuthProvider here
// on purpose — the marketing site never reads wallet or chain state, and
// this is the entire reason it's a separate build from the app (see
// vite.marketing.config.ts): none of that ~600KB+ of wallet-connector code
// should ship to a visitor who's just reading the landing page.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <MarketingApp />
    </BrowserRouter>
  </StrictMode>,
);
