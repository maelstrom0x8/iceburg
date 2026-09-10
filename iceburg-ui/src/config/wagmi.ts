import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { foundry, sepolia } from "wagmi/chains";

// WalletConnect requires a non-empty projectId or RainbowKit throws at startup
// (crashing the whole app). Get a free one at https://cloud.reown.com and put it
// in iceburg-ui/.env.local as VITE_WALLETCONNECT_PROJECT_ID. Until then we fall back
// to a placeholder so the app still loads — injected wallets (MetaMask, etc.) work
// fine either way; only the WalletConnect QR flow needs a real projectId.
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "00000000000000000000000000000000";

if (!import.meta.env.VITE_WALLETCONNECT_PROJECT_ID) {
  console.warn(
    "[wagmi] VITE_WALLETCONNECT_PROJECT_ID is not set — WalletConnect will not work. " +
      "Get a free projectId at https://cloud.reown.com and add it to iceburg-ui/.env.local."
  );
}

export const wagmiConfig = getDefaultConfig({
  appName: "Iceburg",
  projectId: walletConnectProjectId,
  chains: [foundry, sepolia],
  ssr: false,
});
