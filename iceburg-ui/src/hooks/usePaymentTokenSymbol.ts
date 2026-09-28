import { useReadContract } from "wagmi";
import type { Address } from "viem";
import { DemoUSDAbi } from "../contracts";
import { usePaymentTokenAddress } from "../config/paymentToken";

// `tokenAddress` overrides the chain-wide default — see usePaymentTokenDecimals.
export function usePaymentTokenSymbol(tokenAddress?: Address): {
  symbol: string | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const defaultAddress = usePaymentTokenAddress();
  const paymentTokenAddress = tokenAddress ?? defaultAddress;
  const { data, isLoading, error } = useReadContract({
    address: paymentTokenAddress,
    abi: DemoUSDAbi,
    functionName: "symbol",
    query: { enabled: paymentTokenAddress !== undefined },
  });

  return { symbol: data, isLoading, error: error as Error | null };
}
