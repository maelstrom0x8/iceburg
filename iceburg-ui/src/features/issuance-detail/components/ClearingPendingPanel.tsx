import { Link } from "react-router-dom";
import { useWriteContract, usePublicClient, useReadContract } from "wagmi";
import { useState, useCallback } from "react";
import { IssuanceAbi } from "../../../contracts";
import { useIssuanceContext } from "../context/IssuanceContext";
import { formatAmount, formatPrice } from "../../../lib/format";
import { usePaymentTokenDecimals } from "../../../hooks/usePaymentTokenDecimals";
import { usePaymentTokenSymbol } from "../../../hooks/usePaymentTokenSymbol";
import { getRevertReason } from "../../../lib/revertReasons";
import { CountdownTimer } from "../../../components/ui/CountdownTimer";

const CARD = {
  background: "var(--color-app-surface)",
  border: "1px solid var(--color-app-border)",
};

const INSET = {
  background: "var(--color-app-surface-2)",
  border: "1px solid var(--color-app-border)",
};

export function ClearingPendingPanel() {
  const { address, params, state, refetch } = useIssuanceContext();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { decimals } = usePaymentTokenDecimals();
  const { symbol } = usePaymentTokenSymbol();
  const { data: clearingPendingTimeout } = useReadContract({
    address,
    abi: IssuanceAbi,
    functionName: "CLEARING_PENDING_TIMEOUT",
  });

  const [closing, setClosing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
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

  const handleCancelStalledClearing = useCallback(async () => {
    if (!publicClient) return;
    setCancelling(true);
    setErrorMsg(null);
    try {
      const hash = await writeContractAsync({
        address,
        abi: IssuanceAbi,
        functionName: "cancelStalledClearing",
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await refetch();
    } catch (err) {
      setErrorMsg(getRevertReason(err));
    } finally {
      setCancelling(false);
    }
  }, [address, publicClient, refetch, writeContractAsync]);

  const now = BigInt(Math.floor(Date.now() / 1000));
  const canCloseReveal =
    state === 1 && params?.revealWindowEnd && now >= params.revealWindowEnd;

  const stallDeadline =
    params?.revealWindowEnd !== undefined && clearingPendingTimeout !== undefined
      ? params.revealWindowEnd + clearingPendingTimeout
      : undefined;
  const canCancelStalled = state === 2 && stallDeadline !== undefined && now >= stallDeadline;
  const awaitingStallTimeout = state === 2 && stallDeadline !== undefined && now < stallDeadline;

  return (
    <div className="rounded-xl p-6 space-y-5" style={CARD}>
      <div>
        <h3 className="text-base font-semibold" style={{ color: "var(--color-app-text)" }}>
          Clearing Pending
        </h3>
        <p className="text-sm mt-1" style={{ color: "var(--color-app-muted)" }}>
          The reveal window has closed. A solver must run the off-chain clearing algorithm and submit
          a proposal on-chain to proceed. If nobody does, this offering can be cancelled and every
          revealed bidder's escrow reclaimed once the proposal window times out.
        </p>
      </div>

      {awaitingStallTimeout && stallDeadline !== undefined && (
        <div className="rounded-lg p-3 text-sm border border-amber-500/20 bg-amber-500/5 text-amber-600">
          Proposals are still possible. If none arrives, this offering can be cancelled in{" "}
          <CountdownTimer deadline={stallDeadline} className="font-medium" />.
        </div>
      )}

      {params && (
        <div className="grid grid-cols-3 gap-4 rounded-lg p-4 text-sm" style={INSET}>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--color-app-muted)" }}>Total Supply</div>
            <div className="font-medium" style={{ color: "var(--color-app-text)" }}>
              {formatAmount(params.supply)} tokens
            </div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--color-app-muted)" }}>Reserve Price</div>
            <div className="font-medium" style={{ color: "var(--color-app-text)" }}>
              {decimals !== undefined ? `${formatPrice(params.reservePrice, decimals)} ${symbol ?? ""} / token` : "…"}
            </div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--color-app-muted)" }}>Min Holders</div>
            <div className="font-medium" style={{ color: "var(--color-app-text)" }}>
              {params.minHolders.toString()}
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg p-3 text-sm border border-red-500/30 bg-red-500/10 text-red-500">
          {errorMsg}
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        {canCloseReveal && (
          <button
            onClick={handleCloseRevealWindow}
            disabled={closing}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
          >
            {closing ? "Closing…" : "Close Reveal Window"}
          </button>
        )}

        {canCancelStalled && (
          <button
            onClick={handleCancelStalledClearing}
            disabled={cancelling}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            {cancelling ? "Cancelling…" : "Cancel Stalled Offering"}
          </button>
        )}

        <Link
          to={`/app/clearing?issuance=${address}`}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors bg-accent hover:bg-accent-hover"
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
