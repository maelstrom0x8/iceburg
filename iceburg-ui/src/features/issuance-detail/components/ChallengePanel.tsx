import { Link } from "react-router-dom";
import { useWriteContract, usePublicClient } from "wagmi";
import { useState, useCallback } from "react";
import { IssuanceAbi } from "../../../contracts";
import { useIssuanceContext } from "../context/IssuanceContext";
import { formatDUSD } from "../../../lib/format";
import { CountdownTimer } from "../../../components/ui/CountdownTimer";
import { getRevertReason } from "../../../lib/revertReasons";

export function ChallengePanel() {
  const { address, standingProposal, state, refetch } = useIssuanceContext();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [closing, setClosing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCloseChallengeWindow = useCallback(async () => {
    if (!publicClient) return;
    setClosing(true);
    setErrorMsg(null);
    try {
      const hash = await writeContractAsync({
        address,
        abi: IssuanceAbi,
        functionName: "closeChallengeWindow",
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
  const canCloseChallenge =
    state === 3 &&
    standingProposal?.challengeDeadline &&
    now >= standingProposal.challengeDeadline;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-white">Challenge Window Open</h3>
        <p className="text-sm text-slate-400">
          A clearing proposal has been submitted. Any participant may challenge this standing proposal before the deadline if a superior valid clearing exists.
        </p>
      </div>

      {standingProposal && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-lg bg-black/20 p-4 border border-white/5 text-sm">
          <div>
            <div className="text-slate-400 text-xs">Clearing Price</div>
            <div className="text-white font-medium mt-1">
              {formatDUSD(standingProposal.clearingPrice)} / token
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-xs">Proposer</div>
            <div className="text-white font-mono text-xs truncate mt-1">
              {standingProposal.proposer}
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-xs">Challenge Window Ends</div>
            <div className="mt-1">
              <CountdownTimer deadline={standingProposal.challengeDeadline} />
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
          {errorMsg}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        {canCloseChallenge && (
          <button
            onClick={handleCloseChallengeWindow}
            disabled={closing}
            className="px-4 py-2.5 rounded-lg text-sm font-medium bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition-colors disabled:opacity-50"
          >
            {closing ? "Finalizing Challenge Window..." : "Close Challenge Window & Finalize"}
          </button>
        )}

        <Link
          to={`/app/clearing?issuance=${address}`}
          className="px-5 py-2.5 rounded-lg text-sm font-medium bg-accent text-black hover:bg-accent-hover transition-colors inline-flex items-center gap-2"
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
