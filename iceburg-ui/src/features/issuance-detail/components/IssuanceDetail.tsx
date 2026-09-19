import { useReadContract } from "wagmi";
import { IssuanceAbi, SecurityTokenAbi } from "../../../contracts";
import { useIssuanceContext } from "../context/IssuanceContext";
import { StateBadge } from "../../../components/ui/StateBadge";
import { CountdownTimer } from "../../../components/ui/CountdownTimer";
import { formatDUSD, formatUnits, formatTimestamp } from "../../../lib/format";
import { ISSUANCE_STATE } from "../../../lib/issuanceStage";
import { CommitPanel } from "./CommitPanel";
import { RevealPanel } from "./RevealPanel";
import { ClearingPendingPanel } from "./ClearingPendingPanel";
import { ChallengePanel } from "./ChallengePanel";
import { SettledPanel } from "./SettledPanel";

export function IssuanceDetail() {
  const { address, state, params, approvedAttestors, isLoading } = useIssuanceContext();

  const { data: issuerAddress } = useReadContract({
    address,
    abi: IssuanceAbi,
    functionName: "issuer",
  });

  const securityTokenAddress = params?.securityToken;

  const { data: tokenName } = useReadContract({
    address: securityTokenAddress,
    abi: SecurityTokenAbi,
    functionName: "name",
    query: { enabled: Boolean(securityTokenAddress) },
  });

  const { data: tokenSymbol } = useReadContract({
    address: securityTokenAddress,
    abi: SecurityTokenAbi,
    functionName: "symbol",
    query: { enabled: Boolean(securityTokenAddress) },
  });

  if (isLoading && state === undefined) {
    return (
      <div className="animate-pulse space-y-6 max-w-5xl mx-auto p-6">
        <div className="h-10 bg-white/5 rounded-lg w-1/3"></div>
        <div className="h-64 bg-white/5 rounded-xl"></div>
      </div>
    );
  }

  // Active window deadline based on state
  let activeDeadline: bigint | undefined;
  if (state === ISSUANCE_STATE.COMMIT_OPEN) {
    activeDeadline = params?.commitWindowEnd;
  } else if (state === ISSUANCE_STATE.REVEAL_OPEN) {
    activeDeadline = params?.revealWindowEnd;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {(tokenName as string) || "Sealed-Bid Offering"}
            </h1>
            {tokenSymbol && (
              <span className="px-2.5 py-0.5 rounded bg-white/10 text-white font-mono text-xs font-semibold">
                {String(tokenSymbol)}
              </span>
            )}
            {state !== undefined && <StateBadge state={state} />}
          </div>
          <div className="text-xs font-mono text-slate-400 mt-2 flex items-center gap-2">
            <span>Contract:</span>
            <span className="text-slate-300">{address}</span>
          </div>
        </div>

        {activeDeadline !== undefined && (
          <div className="flex flex-col items-start sm:items-end">
            <span className="text-xs text-slate-400">Current Phase Deadline</span>
            <div className="mt-1">
              <CountdownTimer deadline={activeDeadline} className="text-lg font-bold" />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main state panel (2 columns) */}
        <div className="lg:col-span-2">
          {state === ISSUANCE_STATE.COMMIT_OPEN && <CommitPanel />}
          {state === ISSUANCE_STATE.REVEAL_OPEN && <RevealPanel />}
          {state === ISSUANCE_STATE.CLEARING_PENDING && <ClearingPendingPanel />}
          {state === ISSUANCE_STATE.CHALLENGE_OPEN && <ChallengePanel />}
          {(state === ISSUANCE_STATE.SETTLED || state === ISSUANCE_STATE.CANCELLED) && (
            <SettledPanel />
          )}
        </div>

        {/* Sidebar parameter details (1 column) */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4 h-fit text-sm">
          <h3 className="font-semibold text-white border-b border-white/10 pb-3">
            Offering Parameters
          </h3>

          {params ? (
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Supply</span>
                <span className="text-slate-200 font-medium">{formatUnits(params.supply, 18)} tokens</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reserve Price</span>
                <span className="text-slate-200 font-medium">{formatDUSD(params.reservePrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Bidder Cap</span>
                <span className="text-slate-200 font-medium">{params.capBps / 100}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Min Holders</span>
                <span className="text-slate-200 font-medium">{params.minHolders.toString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Min Bid Bond</span>
                <span className="text-slate-200 font-medium">{formatDUSD(params.minBond)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Issuer</span>
                <span className="text-slate-200 font-mono text-[11px] truncate max-w-[140px]" title={issuerAddress}>
                  {issuerAddress || "—"}
                </span>
              </div>

              <div className="pt-3 border-t border-white/10 space-y-2">
                <div className="text-slate-400 font-medium">Timeline</div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Commit Ends</span>
                  <span className="text-slate-300">{formatTimestamp(params.commitWindowEnd)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Reveal Ends</span>
                  <span className="text-slate-300">{formatTimestamp(params.revealWindowEnd)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Challenge Length</span>
                  <span className="text-slate-300">{Number(params.challengeWindowLength) / 60} minutes</span>
                </div>
              </div>

              {approvedAttestors && approvedAttestors.length > 0 && (
                <div className="pt-3 border-t border-white/10 space-y-1">
                  <div className="text-slate-400 font-medium">Approved Attestors ({approvedAttestors.length})</div>
                  {approvedAttestors.map((att: string, idx: number) => (
                    <div key={idx} className="font-mono text-[11px] text-slate-300 truncate">
                      {att}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-400 text-xs py-4 text-center">
              Loading parameters...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
