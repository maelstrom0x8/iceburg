import { useReadContract } from "wagmi";
import { DemoUSDAbi, DemoUSDAddress } from "../contracts";

export function usePaymentTokenDecimals(): {
  decimals: number | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const { data, isLoading, error } = useReadContract({
    address: DemoUSDAddress,
    abi: DemoUSDAbi,
    functionName: "decimals",
    query: { enabled: DemoUSDAddress !== undefined },
  });

  return { decimals: data, isLoading, error: error as Error | null };
}
