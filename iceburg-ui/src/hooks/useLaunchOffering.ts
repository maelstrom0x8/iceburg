import { useCallback, useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { parseEventLogs, zeroAddress } from "viem";
import { IssuanceFactoryAbi, IssuanceFactoryAddressByChain, useContractAddress } from "../contracts";
import { usePaymentTokenAddress } from "../config/paymentToken";

export interface LaunchFormValues {
  supply: bigint;
  reservePrice: bigint;
  capBps: number;
  minHolders: number;
  minBond: bigint;
  approvedAttestors: readonly `0x${string}`[];
  commitWindowEnd: bigint;
  revealWindowEnd: bigint;
  challengeWindowLength: bigint;
  tokenName: string;
  tokenSymbol: string;
}

export type LaunchStatus = "idle" | "pending" | "success" | "error";

export function useLaunchOffering(): {
  launch: (form: LaunchFormValues) => Promise<{ issuance: `0x${string}`; securityToken: `0x${string}` }>;
  status: LaunchStatus;
  error: Error | null;
} {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { address: connectedAddress } = useAccount();
  const issuanceFactoryAddress = useContractAddress(IssuanceFactoryAddressByChain);
  const paymentTokenAddress = usePaymentTokenAddress();
  const [status, setStatus] = useState<LaunchStatus>("idle");
  const [error, setError] = useState<Error | null>(null);

  const launch = useCallback(
    async (form: LaunchFormValues) => {
      setStatus("pending");
      setError(null);

      try {
        if (!connectedAddress) {
          throw new Error("Connect a wallet before launching an offering.");
        }
        if (!publicClient) {
          throw new Error("No RPC connection is available.");
        }
        if (!issuanceFactoryAddress) {
          throw new Error("IssuanceFactory address is not configured for this network.");
        }
        if (!paymentTokenAddress) {
          throw new Error("Payment token address is not configured for this network.");
        }

        const hash = await writeContractAsync({
          address: issuanceFactoryAddress,
          abi: IssuanceFactoryAbi,
          functionName: "createIssuance",
          args: [
            {
              supply: form.supply,
              reservePrice: form.reservePrice,
              capBps: form.capBps,
              minHolders: form.minHolders,
              minBond: form.minBond,
              paymentToken: paymentTokenAddress,
              securityToken: zeroAddress,
              approvedAttestors: [...form.approvedAttestors],
              commitWindowEnd: form.commitWindowEnd,
              revealWindowEnd: form.revealWindowEnd,
              challengeWindowLength: form.challengeWindowLength,
            },
            connectedAddress,
            form.tokenName,
            form.tokenSymbol,
          ],
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        const [created] = parseEventLogs({
          abi: IssuanceFactoryAbi,
          eventName: "IssuanceCreated",
          logs: receipt.logs,
        });

        if (!created) {
          throw new Error("The offering was submitted, but its creation event couldn't be found on-chain.");
        }

        setStatus("success");
        return { issuance: created.args.issuance, securityToken: created.args.securityToken };
      } catch (err) {
        const normalized = err instanceof Error ? err : new Error(String(err));
        setError(normalized);
        setStatus("error");
        throw normalized;
      }
    },
    [writeContractAsync, publicClient, connectedAddress, issuanceFactoryAddress, paymentTokenAddress],
  );

  return { launch, status, error };
}
