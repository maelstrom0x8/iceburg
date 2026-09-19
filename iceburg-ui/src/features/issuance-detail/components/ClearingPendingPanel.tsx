import { Link } from "react-router-dom";
import { useWriteContract, usePublicClient } from "wagmi";
import { useState, useCallback } from "react";
import { IssuanceAbi } from "../../../contracts";
import { useIssuanceContext } from "../context/IssuanceContext";
import { formatDUSD, formatUnits } from "../../../lib/format";
import { getRevertReason } from "../../../lib/revertReasons";

const CARD = {
  background: "var(--color-app-surface)",
  border: "1px solid var(--color-app-border)",
};

export function ClearingPendingPanel() {
  const { address, params, state, refetch } = useIssuanceContext();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [closing, setClosing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCloseRevealWindow = useCallback(async () => {
    if (!publicClient) return;
    setClosing(true);
    setErrorMsg(null);
    try {
      const hash = await writeContractAsync({
        address,
        abi: IssuanceAbi,
        functionName: "closeRevealWindow",
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await refetch();
    } catch (err) {
      setErrorMsg(getRevertReason(err));
    } finally {
      setClosing(false);
    }
  }, [address, publicClient, refetch, writeContractAsync]);

  const now = BigInt(Math.floor(Date.now() / 1000));
  const canCloseReveal =
    state === 1 && params?.revealWindowEnd && now >= params.revealWindowEnd;

  return (
    <div className="rounded-xl p-6 space-y-5" style={CARD}>
      <div>
        <h3 className="text-base font-semibold text-white">Clearing Pending</h3>
        <p className="text-sm mt-1" style={{ color: "var(--color-app-muted)" }}>
          The reveal window has closed. A solver must run the off-chain clearing algorithm and submit a proposal on-chain to proceed.
        </p>
      </div>

      {params && (
        <div
          className="grid grid-cols-3 gap-4 rounded-lg p-4 text-sm"
          style={{ background: "var(--color-app-surface-2)" }}
        >
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--color-app-muted)" }}>Total Supply</div>
            <div className="font-medium text-white">{formatUnits(params.supply, 18)} tokens</div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--color-app-muted)" }}>Reserve Price</div>
            <div className="font-medium text-white">{formatDUSD(params.reservePrice)} / token</div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--color-app-muted)" }}>Min Holders</div>
            <div className="font-medium text-white">{params.minHolders.toString()}</div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div
          className="rounded-lg p-3 text-sm"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
        >
          {errorMsg}
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        {canCloseReveal && (
          <button
            onClick={handleCloseRevealWindow}
            disabled={closing}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: "rgba(245,158,11,0.12)",
              border: "1px solid rgba(245,158,11,0.25)",
              color: "#fcd34d",
            }}
          >
            {closing ? "Closing…" : "Close Reveal Window"}
          </button>
        )}

        <Link
          to={`/app/clearing?issuance=${address}`}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-black transition-colors"
          style={{ background: "var(--color-accent)" }}
        >
          Open Clearing Workbench
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
