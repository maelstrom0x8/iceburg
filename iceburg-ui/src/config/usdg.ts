import type { Address } from "viem";
import { arbitrum, arbitrumSepolia } from "wagmi/chains";
import { robinhoodChain, robinhoodChainTestnet } from "./wagmi";

export const usdgAddressByChain: Record<number, Address> = {
  [arbitrumSepolia.id]: "0xFFC95faa3d63Cde504a05B567C600B78C0b41892",
  [arbitrum.id]: "0x004B506865409877C9fA29bfb1ebA929984B9bbC",
  [robinhoodChainTestnet.id]: "0x7E955252E15c84f5768B83c41a71F9eba181802F",
  [robinhoodChain.id]: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
};
