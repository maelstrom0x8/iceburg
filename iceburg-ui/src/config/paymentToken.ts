import { useChainId } from "wagmi";
import { DemoUSDAddressByChain } from "../contracts";
import { usdgAddressByChain } from "./usdg";

export function usePaymentTokenAddress() {
  const chainId = useChainId();
  return DemoUSDAddressByChain[chainId] ?? usdgAddressByChain[chainId];
}
