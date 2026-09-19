import { useReadContracts } from "wagmi";
import { IssuanceAbi } from "../../../contracts";

export interface IssuanceOnChainState {
  state: number | undefined;
  params:
    | {
        supply: bigint;
        reservePrice: bigint;
        capBps: number;
        minHolders: number;
        minBond: bigint;
        paymentToken: `0x${string}`;
        securityToken: `0x${string}`;
        commitWindowEnd: bigint;
        revealWindowEnd: bigint;
        challengeWindowLength: bigint;
      }
    | undefined;
  cap: bigint | undefined;
  bidCount: bigint | undefined;
  standingProposal:
    | {
        clearingPrice: bigint;
        allocations: readonly bigint[];
        proposer: `0x${string}`;
        bond: bigint;
        challengeDeadline: bigint;
        isUnresolvedClaim: boolean;
      }
    | undefined;
  /** bytes32 commitment of the connected wallet, or undefined if wallet not connected. */
  commitment: `0x${string}` | undefined;
  commitBond: bigint | undefined;
  issuer: `0x${string}` | undefined;
  finalized: boolean | undefined;
  approvedAttestors: readonly `0x${string}`[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Batches all contract reads for a single Issuance into one multicall.
 * Pass `walletAddress` as the connected account to read that bidder's
 * commitment and bond. Pass `undefined` when no wallet is connected.
 */
export function useIssuanceState(
  issuanceAddress: `0x${string}`,
  walletAddress: `0x${string}` | undefined,
): IssuanceOnChainState {
  const enabled = !!issuanceAddress;

  const contracts = [
    { address: issuanceAddress, abi: IssuanceAbi, functionName: "state" },
    { address: issuanceAddress, abi: IssuanceAbi, functionName: "params" },
    { address: issuanceAddress, abi: IssuanceAbi, functionName: "cap" },
    { address: issuanceAddress, abi: IssuanceAbi, functionName: "bidCount" },
    { address: issuanceAddress, abi: IssuanceAbi, functionName: "standingProposal" },
    { address: issuanceAddress, abi: IssuanceAbi, functionName: "issuer" },
    { address: issuanceAddress, abi: IssuanceAbi, functionName: "finalized" },
    { address: issuanceAddress, abi: IssuanceAbi, functionName: "approvedAttestors" },
    ...(walletAddress
      ? [
          {
            address: issuanceAddress,
            abi: IssuanceAbi,
            functionName: "commitmentOf",
            args: [walletAddress],
          },
          {
            address: issuanceAddress,
            abi: IssuanceAbi,
            functionName: "commitBondOf",
            args: [walletAddress],
          },
        ]
      : []),
  ] as const;

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts,
    query: {
      enabled,
      refetchInterval: 12_000, // roughly one block
    },
  });

  const results = data ?? [];

  const rawParams = results[1]?.result as
    | readonly [bigint, bigint, number, number, bigint, `0x${string}`, `0x${string}`, bigint, bigint, bigint]
    | undefined;

  const rawProposal = results[4]?.result as
    | readonly [bigint, readonly bigint[], `0x${string}`, bigint, bigint, boolean]
    | undefined;

  return {
    state: results[0]?.result !== undefined ? Number(results[0].result) : undefined,
    params: rawParams
      ? {
          supply: rawParams[0],
          reservePrice: rawParams[1],
          capBps: rawParams[2],
          minHolders: rawParams[3],
          minBond: rawParams[4],
          paymentToken: rawParams[5],
          securityToken: rawParams[6],
          commitWindowEnd: rawParams[7],
          revealWindowEnd: rawParams[8],
          challengeWindowLength: rawParams[9],
        }
      : undefined,
    cap: results[2]?.result as bigint | undefined,
    bidCount: results[3]?.result as bigint | undefined,
    standingProposal: rawProposal
      ? {
          clearingPrice: rawProposal[0],
          allocations: rawProposal[1],
          proposer: rawProposal[2],
          bond: rawProposal[3],
          challengeDeadline: rawProposal[4],
          isUnresolvedClaim: rawProposal[5],
        }
      : undefined,
    issuer: results[5]?.result as `0x${string}` | undefined,
    finalized: results[6]?.result as boolean | undefined,
    approvedAttestors: results[7]?.result as readonly `0x${string}`[] | undefined,
    commitment: walletAddress ? (results[8]?.result as `0x${string}` | undefined) : undefined,
    commitBond: walletAddress ? (results[9]?.result as bigint | undefined) : undefined,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
