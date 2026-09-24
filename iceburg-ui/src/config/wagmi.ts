import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";
import { foundry, arbitrum, arbitrumSepolia } from "wagmi/chains";

export const robinhoodChainTestnet = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] } },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://explorer.testnet.chain.robinhood.com" },
  },
  testnet: true,
});

export const robinhoodChain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.chain.robinhood.com"] } },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" },
  },
});

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

// `foundry` (local anvil, chain id 31337, RPC at http://127.0.0.1:8545) only
// belongs in this list for local dev — it's the first entry, so it's also
// wagmi's default/fallback chain before a wallet connects. Included in a
// deployed build, that default makes every unauthenticated read (e.g. the
// offerings list) try to reach localhost from the visitor's own browser and
// fail outright. `import.meta.env.DEV` is true only under `vite`/`vite dev`,
// false for every `vite build` (including Preview/Production deploys), so
// this keeps the convenient local default without shipping it.
const chains = import.meta.env.DEV
  ? ([foundry, arbitrumSepolia, arbitrum, robinhoodChainTestnet, robinhoodChain] as const)
  : ([arbitrumSepolia, arbitrum, robinhoodChainTestnet, robinhoodChain] as const);

export const wagmiConfig = getDefaultConfig({
  appName: "Iceburg",
  projectId: walletConnectProjectId,
  chains,
  ssr: false,
});
