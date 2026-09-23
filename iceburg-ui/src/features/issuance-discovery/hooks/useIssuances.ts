import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { parseEventLogs } from "viem";
import { IssuanceFactoryAbi, IssuanceFactoryAddressByChain, useContractAddress } from "../../../contracts";

export interface IssuanceSummary {
  issuanceAddress: `0x${string}`;
  securityTokenAddress: `0x${string}`;
  issuer: `0x${string}`;
  tokenName: string;
  tokenSymbol: string;
  /** Block number of the creation event — useful for ordering. */
  blockNumber: bigint;
}

/**
 * Fetches all `IssuanceCreated` events from the factory and returns a
 * structured list ordered chronologically (oldest first).
 *
 * Stale time is intentionally short (30 s) so the discovery table
 * refreshes reasonably quickly after a new issuance is created.
 */
export function useIssuances(): {
  issuances: IssuanceSummary[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const publicClient = usePublicClient();
  const issuanceFactoryAddress = useContractAddress(IssuanceFactoryAddressByChain);

  const query = useQuery({
    queryKey: ["issuances", issuanceFactoryAddress],
    enabled: !!publicClient && !!issuanceFactoryAddress,
    staleTime: 30_000,
    queryFn: async (): Promise<IssuanceSummary[]> => {
      if (!publicClient || !issuanceFactoryAddress) return [];

      const logs = await publicClient.getLogs({
        address: issuanceFactoryAddress,
        fromBlock: 0n,
        toBlock: "latest",
      });

      const parsed = parseEventLogs({
        abi: IssuanceFactoryAbi,
        eventName: "IssuanceCreated",
        logs,
        strict: false,
      });

      return parsed.map((log) => ({
        issuanceAddress: log.args.issuance as `0x${string}`,
        securityTokenAddress: log.args.securityToken as `0x${string}`,
        issuer: log.args.issuer as `0x${string}`,
        tokenName: (log.args.tokenName as string) ?? "",
        tokenSymbol: (log.args.tokenSymbol as string) ?? "",
        blockNumber: log.blockNumber ?? 0n,
      }));
    },
  });

  return {
    issuances: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
