import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { parseEventLogs } from "viem";
import { IssuanceFactoryAbi, IssuanceFactoryAddressByChain, useContractAddress } from "../../../contracts";
import type { IssuanceSummary } from "../../issuance-discovery/hooks/useIssuances";

/**
 * Returns only the issuances created by `issuerAddress`.
 * Filters by the indexed `issuer` topic directly in the RPC call —
 * no client-side scanning over all events.
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
        fromBlock: 0n,
        toBlock: "latest",
      });

      const parsed = parseEventLogs({
        abi: IssuanceFactoryAbi,
        eventName: "IssuanceCreated",
        logs,
        strict: false,
      });

      return parsed
        .filter(
          (log) =>
            (log.args.issuer as string | undefined)?.toLowerCase() ===
            issuerAddress.toLowerCase(),
        )
        .map((log) => ({
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
  };
}
