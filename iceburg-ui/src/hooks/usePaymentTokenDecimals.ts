import { useReadContract } from "wagmi";
import { DemoUSDAbi } from "../contracts";
import { usePaymentTokenAddress } from "../config/paymentToken";

export function usePaymentTokenDecimals(): {
  decimals: number | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const paymentTokenAddress = usePaymentTokenAddress();
  const { data, isLoading, error } = useReadContract({
    address: paymentTokenAddress,
    abi: DemoUSDAbi,
    functionName: "decimals",
    query: { enabled: paymentTokenAddress !== undefined },
  });

  return { decimals: data, isLoading, error: error as Error | null };
}
