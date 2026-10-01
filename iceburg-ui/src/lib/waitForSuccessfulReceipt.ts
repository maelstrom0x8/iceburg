import type { Abi, Address, PublicClient } from "viem";

interface CallParams {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
}

/**
 * `publicClient.waitForTransactionReceipt` resolves normally for a mined-but-
 * reverted transaction (`status: "reverted"`) — it only rejects on timeout or
 * if the hash is never found. Every write path in this app needs a reverted
 * transaction to surface as an error, not as success, so this re-simulates
 * the same call once a revert is observed to recover the actual on-chain
 * revert reason via `getRevertReason`, falling back to a generic message if
 * state has moved on enough that the resimulation no longer reverts.
 */
export async function waitForSuccessfulReceipt(
  publicClient: PublicClient,
  hash: `0x${string}`,
  callParams: CallParams,
  account: Address,
) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    await publicClient.simulateContract({ ...callParams, account });
    throw new Error("Transaction reverted on-chain for an unspecified reason.");
  }
  return receipt;
}
