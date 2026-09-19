import { useReadContracts } from "wagmi";
import { IssuanceAbi } from "../../../contracts";
import type { IssuanceSummary } from "../../issuance-discovery/hooks/useIssuances";

const ZERO_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

export interface BidSummary {
  issuanceSummary: IssuanceSummary;
  commitment: `0x${string}`;
  hasCommitted: boolean;
}

/**
 * For each known issuance, reads `commitmentOf(walletAddress)`.
 * Returns only those issuances where the wallet has an active commitment.
 */
export function useMyBids(
  issuances: IssuanceSummary[],
  walletAddress: `0x${string}` | undefined,
): {
  bids: BidSummary[];
  isLoading: boolean;
} {
  const contracts = walletAddress
    ? issuances.map((iss) => ({
        address: iss.issuanceAddress,
        abi: IssuanceAbi,
        functionName: "commitmentOf" as const,
        args: [walletAddress] as const,
      }))
    : [];

  const { data, isLoading } = useReadContracts({
    contracts,
    query: {
      enabled: !!walletAddress && issuances.length > 0,
      refetchInterval: 30_000,
    },
  });

  const bids: BidSummary[] = [];
  (data ?? []).forEach((result, idx) => {
    const commitment = result.result as `0x${string}` | undefined;
    if (commitment && commitment !== ZERO_HASH) {
      bids.push({
        issuanceSummary: issuances[idx],
        commitment,
        hasCommitted: true,
      });
    }
  });

  return { bids, isLoading };
}
