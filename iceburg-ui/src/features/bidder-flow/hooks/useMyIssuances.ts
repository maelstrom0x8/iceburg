import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { getAbiItem, parseEventLogs } from "viem";
import { IssuanceFactoryAbi, IssuanceFactoryAddressByChain, useContractAddress } from "../../../contracts";
import type { IssuanceSummary } from "../../issuance-discovery/hooks/useIssuances";

const issuanceCreatedEvent = getAbiItem({ abi: IssuanceFactoryAbi, name: "IssuanceCreated" });

/**
 * Returns only the issuances created by `issuerAddress`.
 * Filters by the indexed `issuer` topic directly in the RPC call (`args` on
 * `getLogs`, translated into an eth_getLogs topic filter) — no client-side
 * scanning over all events.
 */
export function useMyIssuances(issuerAddress: `0x${string}` | undefined): {
  issuances: IssuanceSummary[];
  isLoading: boolean;
  error: Error | null;
} {
  const publicClient = usePublicClient();
  const issuanceFactoryAddress = useContractAddress(IssuanceFactoryAddressByChain);

  const query = useQuery({
    queryKey: ["myIssuances", issuanceFactoryAddress, issuerAddress],
    enabled: !!publicClient && !!issuanceFactoryAddress && !!issuerAddress,
    staleTime: 30_000,
    queryFn: async (): Promise<IssuanceSummary[]> => {
      if (!publicClient || !issuanceFactoryAddress || !issuerAddress) return [];

      const logs = await publicClient.getLogs({
        address: issuanceFactoryAddress,
        event: issuanceCreatedEvent,
        args: { issuer: issuerAddress },
        fromBlock: 0n,
        toBlock: "latest",
      });

      const parsed = parseEventLogs({
        abi: IssuanceFactoryAbi,
        eventName: "IssuanceCreated",
        logs,
        strict: false,
      });

      // strict: false tolerates a log that doesn't fully decode rather than
      // throwing — skip any that came through without the indexed address
      // fields a real IssuanceCreated log always carries.
      return parsed
        .filter((log) => log.args.issuance && log.args.securityToken && log.args.issuer)
        .map((log) => ({
          issuanceAddress: log.args.issuance as `0x${string}`,
          securityTokenAddress: log.args.securityToken as `0x${string}`,
          issuer: log.args.issuer as `0x${string}`,
          tokenName: log.args.tokenName ?? "",
          tokenSymbol: log.args.tokenSymbol ?? "",
          blockNumber: log.blockNumber ?? 0n,
        }));
    },
  });

  return {
    issuances: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}
