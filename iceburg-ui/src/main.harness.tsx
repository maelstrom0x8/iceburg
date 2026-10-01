import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { WagmiProvider, createConfig, http, mock } from "wagmi";
import { foundry } from "wagmi/chains";
import { AuthProvider } from "./contexts/AuthContext";
import "./index.css";
import App from "./App.tsx";

const ANVIL_ACCOUNT_0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as const;

const harnessConfig = createConfig({
  chains: [foundry],
  connectors: [mock({ accounts: [ANVIL_ACCOUNT_0], features: { defaultConnected: true, reconnect: true } })],
  transports: { [foundry.id]: http("http://127.0.0.1:8545") },
});

const queryClient = new QueryClient();

const rainbowKitTheme = lightTheme({ accentColor: "#020617", accentColorForeground: "#ffffff", borderRadius: "large" });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WagmiProvider config={harnessConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rainbowKitTheme}>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/app/*" element={<App />} />
                <Route path="/*" element={<Navigate to="/app" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
);
