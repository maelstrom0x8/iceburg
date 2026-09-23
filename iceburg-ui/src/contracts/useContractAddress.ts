import { useChainId } from "wagmi";
import type { Address } from "viem";

export function useContractAddress(addressByChain: Record<number, Address>): Address | undefined {
  const chainId = useChainId();
  return addressByChain[chainId];
}
