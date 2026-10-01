import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "./config/wagmi";
import { AuthProvider } from "./contexts/AuthContext";
import App from "./App";

const queryClient = new QueryClient();

const rainbowKitTheme = lightTheme({ accentColor: "#020617", accentColorForeground: "#ffffff", borderRadius: "large" });

export default function AppShell() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rainbowKitTheme}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
