import { Link } from "react-router-dom";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { useState, useCallback } from "react";
import type { Abi } from "viem";
import { IssuanceAbi } from "../../../contracts";
import { useIssuanceContext } from "../context/IssuanceContext";
import { getRevertReason } from "../../../lib/revertReasons";
import { waitForSuccessfulReceipt } from "../../../lib/waitForSuccessfulReceipt";
import { formatPrice } from "../../../lib/format";
import { usePaymentTokenDecimals } from "../../../hooks/usePaymentTokenDecimals";
import { usePaymentTokenSymbol } from "../../../hooks/usePaymentTokenSymbol";
import { CountdownTimer } from "../../../components/ui/CountdownTimer";

const CARD = {
  background: "var(--color-app-surface)",
  border: "1px solid var(--color-app-border)",
};

const INSET = {
  background: "var(--color-app-surface-2)",
  border: "1px solid var(--color-app-border)",
};

export function ChallengePanel() {
  const { address, standingProposal, state, refetch } = useIssuanceContext();
  const { address: walletAddress } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { decimals } = usePaymentTokenDecimals();
  const { symbol } = usePaymentTokenSymbol();

  const [closing, setClosing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCloseChallengeWindow = useCallback(async () => {
    if (!publicClient || !walletAddress) return;
    setClosing(true);
    setErrorMsg(null);
    try {
      const callParams = { address, abi: IssuanceAbi as Abi, functionName: "closeChallengeWindow" };
      const hash = await writeContractAsync(callParams);
      await waitForSuccessfulReceipt(publicClient, hash, callParams, walletAddress);
      await refetch();
    } catch (err) {
      setErrorMsg(getRevertReason(err));
    } finally {
      setClosing(false);
    }
  }, [address, publicClient, walletAddress, refetch, writeContractAsync]);

  const now = BigInt(Math.floor(Date.now() / 1000));
  const canCloseChallenge =
    state === 3 &&
    standingProposal?.challengeDeadline &&
    now >= standingProposal.challengeDeadline;

  return (
    <div className="rounded-xl p-6 space-y-6" style={CARD}>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold" style={{ color: "var(--color-app-text)" }}>
          Challenge Window Open
        </h3>
        <p className="text-sm" style={{ color: "var(--color-app-muted)" }}>
          A clearing proposal has been submitted. Any participant may challenge this standing
          proposal before the deadline if a superior valid clearing exists.
        </p>
      </div>

      {standingProposal && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-lg p-4 text-sm" style={INSET}>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--color-app-muted)" }}>Clearing Price</div>
            <div className="font-medium" style={{ color: "var(--color-app-text)" }}>
              {decimals !== undefined
                ? `${formatPrice(standingProposal.clearingPrice, decimals)} ${symbol ?? ""} / token`
                : "…"}
            </div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--color-app-muted)" }}>Proposer</div>
            <div className="font-mono text-xs truncate" style={{ color: "var(--color-app-text)" }}>
              {standingProposal.proposer}
            </div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--color-app-muted)" }}>Challenge Window Ends</div>
            <CountdownTimer deadline={standingProposal.challengeDeadline} />
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg p-3 text-sm border border-red-500/30 bg-red-500/10 text-red-500">
          {errorMsg}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        {canCloseChallenge && (
          <button
            onClick={handleCloseChallengeWindow}
            disabled={closing}
            className="px-4 py-2.5 rounded-lg text-sm font-medium border border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
          >
            {closing ? "Finalizing…" : "Close Challenge Window & Finalize"}
          </button>
        )}

        <Link
          to={`/app/clearing?issuance=${address}`}
          className="px-5 py-2.5 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors inline-flex items-center gap-2"
        >
          <span>Challenge Standing Proposal</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
