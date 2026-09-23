import { useCallback } from "react";
import { useWalletClient, usePublicClient, useChainId } from "wagmi";
import { http } from "viem";
import { constants, createZeroDevPaymasterClient } from "@zerodev/sdk";
import { create7702KernelAccount, create7702KernelAccountClient } from "@zerodev/ecdsa-validator";
import { isZeroDevConfigured, zerodevBundlerUrl, zerodevPaymasterUrl } from "../config/zerodev";

export function useSponsoredKernelClient() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const chainId = useChainId();

  const getSponsoredClient = useCallback(async () => {
    if (!isZeroDevConfigured) {
      throw new Error("Gas-sponsored bidding is not configured for this deployment.");
    }
    if (!walletClient || !publicClient || !publicClient.chain) {
      throw new Error("Connect a wallet before enabling gas-sponsored bidding.");
    }

    try {
      const entryPoint = constants.getEntryPoint("0.7");

      const account = await create7702KernelAccount<"0.7">(publicClient, {
        signer: walletClient,
        entryPoint,
        kernelVersion: constants.KERNEL_V3_3,
      });

      const paymasterClient = createZeroDevPaymasterClient({
        chain: publicClient.chain,
        transport: http(zerodevPaymasterUrl(chainId)),
      });

      return await create7702KernelAccountClient({
        account,
        chain: publicClient.chain,
        bundlerTransport: http(zerodevBundlerUrl(chainId)),
        paymaster: paymasterClient,
        client: publicClient,
      });
    } catch (cause) {
      throw new Error("Gas-sponsored bidding is unavailable right now — uncheck the box and try again.", { cause });
    }
  }, [walletClient, publicClient, chainId]);

  return { getSponsoredClient, isAvailable: isZeroDevConfigured };
}
