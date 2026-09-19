import { useCallback, useMemo } from "react";
import { useReadContracts, useWatchContractEvent } from "wagmi";
import { IssuanceAbi } from "../../../contracts";

export interface IssuanceParamsData {
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

export interface StandingProposalData {
  clearingPrice: bigint;
  allocations: readonly bigint[];
  proposer: `0x${string}`;
  bond: bigint;
  challengeDeadline: bigint;
  isUnresolvedClaim: boolean;
}

export interface IssuanceSnapshot {
  state: number;
  cap: bigint;
  issuer: `0x${string}`;
  finalized: boolean;
  params: IssuanceParamsData;
  approvedAttestors: readonly `0x${string}`[];
  bidCount: bigint;
  committedCount: bigint;
  standingProposal: StandingProposalData;
}

export function useIssuance(address: `0x${string}` | undefined): {
  data: IssuanceSnapshot | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const enabled = address !== undefined;

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: address
      ? [
          { address, abi: IssuanceAbi, functionName: "state" },
          { address, abi: IssuanceAbi, functionName: "cap" },
          { address, abi: IssuanceAbi, functionName: "issuer" },
          { address, abi: IssuanceAbi, functionName: "finalized" },
          { address, abi: IssuanceAbi, functionName: "params" },
          { address, abi: IssuanceAbi, functionName: "approvedAttestors" },
          { address, abi: IssuanceAbi, functionName: "bidCount" },
          { address, abi: IssuanceAbi, functionName: "committedCount" },
          { address, abi: IssuanceAbi, functionName: "standingProposal" },
        ]
      : undefined,
    query: { enabled },
  });

  const refetchAll = useCallback(() => {
    void refetch();
  }, [refetch]);

  useWatchContractEvent({ address, abi: IssuanceAbi, eventName: "BidCommitted", onLogs: refetchAll, enabled });
  useWatchContractEvent({ address, abi: IssuanceAbi, eventName: "CommitWindowClosed", onLogs: refetchAll, enabled });
  useWatchContractEvent({ address, abi: IssuanceAbi, eventName: "BidRevealed", onLogs: refetchAll, enabled });
  useWatchContractEvent({ address, abi: IssuanceAbi, eventName: "BondForfeited", onLogs: refetchAll, enabled });
  useWatchContractEvent({ address, abi: IssuanceAbi, eventName: "RevealWindowClosed", onLogs: refetchAll, enabled });
  useWatchContractEvent({ address, abi: IssuanceAbi, eventName: "ClearingProposed", onLogs: refetchAll, enabled });
  useWatchContractEvent({ address, abi: IssuanceAbi, eventName: "UnresolvedClaimProposed", onLogs: refetchAll, enabled });
  useWatchContractEvent({ address, abi: IssuanceAbi, eventName: "ClearingChallenged", onLogs: refetchAll, enabled });
  useWatchContractEvent({ address, abi: IssuanceAbi, eventName: "ChallengeWindowClosed", onLogs: refetchAll, enabled });
  useWatchContractEvent({ address, abi: IssuanceAbi, eventName: "WinnerSettled", onLogs: refetchAll, enabled });
  useWatchContractEvent({ address, abi: IssuanceAbi, eventName: "NonWinnerRefunded", onLogs: refetchAll, enabled });
  useWatchContractEvent({ address, abi: IssuanceAbi, eventName: "Settled", onLogs: refetchAll, enabled });
  useWatchContractEvent({ address, abi: IssuanceAbi, eventName: "Cancelled", onLogs: refetchAll, enabled });

  const snapshot = useMemo<IssuanceSnapshot | undefined>(() => {
    if (!data) return undefined;
    const [
      stateResult,
      capResult,
      issuerResult,
      finalizedResult,
      paramsResult,
      approvedAttestorsResult,
      bidCountResult,
      committedCountResult,
      standingProposalResult,
    ] = data;

    if (
      stateResult.status !== "success" ||
      capResult.status !== "success" ||
      issuerResult.status !== "success" ||
      finalizedResult.status !== "success" ||
      paramsResult.status !== "success" ||
      approvedAttestorsResult.status !== "success" ||
      bidCountResult.status !== "success" ||
      committedCountResult.status !== "success" ||
      standingProposalResult.status !== "success"
    ) {
      return undefined;
    }

    const [
      supply,
      reservePrice,
      capBps,
      minHolders,
      minBond,
      paymentToken,
      securityToken,
      commitWindowEnd,
      revealWindowEnd,
      challengeWindowLength,
    ] = paramsResult.result;

    const [clearingPrice, allocations, proposer, bond, challengeDeadline, isUnresolvedClaim] =
      standingProposalResult.result;

    return {
      state: stateResult.result,
      cap: capResult.result,
      issuer: issuerResult.result,
      finalized: finalizedResult.result,
      params: {
        supply,
        reservePrice,
        capBps,
        minHolders,
        minBond,
        paymentToken,
        securityToken,
        commitWindowEnd,
        revealWindowEnd,
        challengeWindowLength,
      },
      approvedAttestors: approvedAttestorsResult.result,
      bidCount: bidCountResult.result,
      committedCount: committedCountResult.result,
      standingProposal: { clearingPrice, allocations, proposer, bond, challengeDeadline, isUnresolvedClaim },
    };
  }, [data]);

  return {
    data: snapshot,
    isLoading,
    error: error as Error | null,
    refetch: refetchAll,
  };
}
