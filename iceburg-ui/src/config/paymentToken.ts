import { useChainId } from "wagmi";
import { DemoUSDAddressByChain } from "../contracts";

export function usePaymentTokenAddress() {
  const chainId = useChainId();
  return DemoUSDAddressByChain[chainId];
}
