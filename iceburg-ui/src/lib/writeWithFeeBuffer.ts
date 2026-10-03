import type { Abi, Address } from "viem";
import type { usePublicClient, useWriteContract } from "wagmi";

interface CallParams {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
}

export async function writeWithFeeBuffer(
  writeContractAsync: ReturnType<typeof useWriteContract>["writeContractAsync"],
  publicClient: ReturnType<typeof usePublicClient>,
  params: CallParams,
) {
  if (!publicClient) return writeContractAsync(params);

  const { maxFeePerGas, maxPriorityFeePerGas } = await publicClient.estimateFeesPerGas();
  return writeContractAsync({
    ...params,
    maxFeePerGas: (maxFeePerGas * 125n) / 100n,
    maxPriorityFeePerGas: (maxPriorityFeePerGas * 125n) / 100n,
  });
}
