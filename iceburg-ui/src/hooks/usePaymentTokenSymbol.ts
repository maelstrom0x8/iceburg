import { useReadContract } from "wagmi";
import { DemoUSDAbi } from "../contracts";
import { usePaymentTokenAddress } from "../config/paymentToken";

export function usePaymentTokenSymbol(): {
  symbol: string | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const paymentTokenAddress = usePaymentTokenAddress();
  const { data, isLoading, error } = useReadContract({
    address: paymentTokenAddress,
    abi: DemoUSDAbi,
    functionName: "symbol",
    query: { enabled: paymentTokenAddress !== undefined },
  });

  return { symbol: data, isLoading, error: error as Error | null };
}
