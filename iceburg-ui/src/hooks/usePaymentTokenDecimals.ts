import { useReadContract } from "wagmi";
import type { Address } from "viem";
import { DemoUSDAbi } from "../contracts";
import { usePaymentTokenAddress } from "../config/paymentToken";

// `tokenAddress` overrides the chain-wide default — pass an offering's own
// `params.paymentToken` when reading for a specific issuance, since a
// contract may be deployed with a payment token other than the chain's
// default (the mismatch otherwise shows the wrong decimals/symbol and can
// mis-scale the escrow amount actually approved and transferred).
export function usePaymentTokenDecimals(tokenAddress?: Address): {
  decimals: number | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const defaultAddress = usePaymentTokenAddress();
  const paymentTokenAddress = tokenAddress ?? defaultAddress;
  const { data, isLoading, error } = useReadContract({
    address: paymentTokenAddress,
    abi: DemoUSDAbi,
    functionName: "decimals",
    query: { enabled: paymentTokenAddress !== undefined },
  });

  return { decimals: data, isLoading, error: error as Error | null };
}
