import { useReadContract, useReadContracts } from "wagmi";
import { IssuanceAbi } from "../../../contracts";

// Matches Issuance.sol's MAX_BIDS. Hardcoded rather than read from the
// target contract's own MAX_BIDS() — this hook can be pointed at an
// untrusted, possibly non-Issuance address (see ClearingWorkbench.tsx's
// free-text/URL-param address input), and a malicious contract could just
// return an inflated MAX_BIDS() to defeat a self-reported bound.
const MAX_POSSIBLE_BIDS = 64;

export interface RevealedBid {
  index: number;
  bidder: `0x${string}`;
  qty: bigint;
  price: bigint;
  eligible: boolean;
  escrow: bigint;
  attestor: `0x${string}`;
  attestationExpiry: bigint;
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

  const rawCount = rawBidCount !== undefined ? Number(rawBidCount) : 0;
  const exceedsMaxBids = rawCount > MAX_POSSIBLE_BIDS;
  const count = exceedsMaxBids ? 0 : rawCount;

  const { data: rawBids, isLoading: bidsLoading, error: readError } = useReadContracts({
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

  const error = exceedsMaxBids
    ? new Error(
        `bidCount() returned ${rawCount}, which exceeds the protocol maximum of ${MAX_POSSIBLE_BIDS} — refusing to query bids from this contract.`,
      )
    : (readError as Error | null);

  const bids: RevealedBid[] = (rawBids ?? [])
    .map((result, i) => {
      const raw = result.result as
        | readonly [`0x${string}`, bigint, bigint, boolean, bigint, `0x${string}`, bigint]
        | undefined;
      if (!raw) return null;
      return {
        index: i,
        bidder: raw[0],
        qty: raw[1],
        price: raw[2],
        eligible: raw[3],
        escrow: raw[4],
        attestor: raw[5],
        attestationExpiry: raw[6],
      };
    })
    .filter((b): b is RevealedBid => b !== null);

  return {
    bids,
    bidCount: count,
    isLoading: countLoading || bidsLoading,
    error,
  };
}
