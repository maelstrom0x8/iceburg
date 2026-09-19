import { useReadContract, useReadContracts } from "wagmi";
import { IssuanceAbi } from "../../../contracts";

export interface RevealedBid {
  index: number;
  bidder: `0x${string}`;
  qty: bigint;
  price: bigint;
  eligible: boolean;
  escrow: bigint;
}

/**
 * Fetches all revealed bids from an Issuance in two phases:
 * 1. Read bidCount()
 * 2. Batch-read bidAt(i) for i in [0, bidCount)
 *
 * Returns an empty array while loading or when the address is undefined.
 */
export function useIssuanceBids(
  issuanceAddress: `0x${string}` | undefined,
): {
  bids: RevealedBid[];
  bidCount: number;
  isLoading: boolean;
  error: Error | null;
} {
  const { data: rawBidCount, isLoading: countLoading } = useReadContract({
    address: issuanceAddress,
    abi: IssuanceAbi,
    functionName: "bidCount",
    query: { enabled: !!issuanceAddress, refetchInterval: 12_000 },
  });

  const count = rawBidCount !== undefined ? Number(rawBidCount) : 0;

  const { data: rawBids, isLoading: bidsLoading, error } = useReadContracts({
    contracts: Array.from({ length: count }, (_, i) => ({
      address: issuanceAddress as `0x${string}`,
      abi: IssuanceAbi,
      functionName: "bidAt" as const,
      args: [BigInt(i)] as const,
    })),
    query: {
      enabled: count > 0 && !!issuanceAddress,
      refetchInterval: 12_000,
    },
  });

  const bids: RevealedBid[] = (rawBids ?? [])
    .map((result, i) => {
      const raw = result.result as
        | readonly [`0x${string}`, bigint, bigint, boolean, bigint]
        | undefined;
      if (!raw) return null;
      return {
        index: i,
        bidder: raw[0],
        qty: raw[1],
        price: raw[2],
        eligible: raw[3],
        escrow: raw[4],
      };
    })
    .filter((b): b is RevealedBid => b !== null);

  return {
    bids,
    bidCount: count,
    isLoading: countLoading || bidsLoading,
    error: error as Error | null,
  };
}
