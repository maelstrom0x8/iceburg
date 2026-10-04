import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { useState, useCallback } from "react";
import type { Abi } from "viem";
import { IssuanceAbi } from "../../../contracts";
import { useIssuanceContext } from "../context/IssuanceContext";
import { getRevertReason } from "../../../lib/revertReasons";
import { waitForSuccessfulReceipt } from "../../../lib/waitForSuccessfulReceipt";
import { writeWithFeeBuffer } from "../../../lib/writeWithFeeBuffer";

const CARD = {
  background: "var(--color-app-surface)",
  border: "1px solid var(--color-app-border)",
};

export function CloseCommitWindowPanel() {
  const { address, refetch } = useIssuanceContext();
  const { address: walletAddress } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [closing, setClosing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCloseCommitWindow = useCallback(async () => {
    if (!publicClient || !walletAddress) return;
    setClosing(true);
    setErrorMsg(null);
    try {
      const callParams = { address, abi: IssuanceAbi as Abi, functionName: "closeCommitWindow" };
      const hash = await writeWithFeeBuffer(writeContractAsync, publicClient, callParams);
      await waitForSuccessfulReceipt(publicClient, hash, callParams, walletAddress);
      await refetch();
    } catch (err) {
      setErrorMsg(getRevertReason(err));
    } finally {
      setClosing(false);
    }
  }, [address, publicClient, walletAddress, refetch, writeContractAsync]);

  return (
    <div className="rounded-xl p-6 space-y-5" style={CARD}>
      <div>
        <h3 className="text-base font-semibold" style={{ color: "var(--color-app-text)" }}>
          Bidding Has Ended
        </h3>
        <p className="text-sm mt-1" style={{ color: "var(--color-app-muted)" }}>
          The commit window has closed. Anyone can now open the reveal phase, where each bidder
          opens their sealed bid.
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-lg p-3 text-sm border border-red-500/30 bg-red-500/10 text-red-500">
          {errorMsg}
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleCloseCommitWindow}
          disabled={closing || !walletAddress}
          className="px-4 py-2 rounded-lg text-sm font-medium border border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
        >
          {closing ? "Closing…" : "Close Commit Window"}
        </button>
      </div>
    </div>
  );
}
