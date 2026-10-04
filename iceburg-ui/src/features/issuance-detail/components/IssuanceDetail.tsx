import { useReadContract } from "wagmi";
import { IssuanceAbi, SecurityTokenAbi } from "../../../contracts";
import { useIssuanceContext } from "../context/IssuanceContext";
import { StateBadge } from "../../../components/ui/StateBadge";
import { CountdownTimer } from "../../../components/ui/CountdownTimer";
import { formatAmount, formatPrice, formatTimestamp } from "../../../lib/format";
import { usePaymentTokenDecimals } from "../../../hooks/usePaymentTokenDecimals";
import { usePaymentTokenSymbol } from "../../../hooks/usePaymentTokenSymbol";
import { useNowSeconds } from "../../../hooks/useNowSeconds";
import { ISSUANCE_STATE } from "../../../lib/issuanceStage";
import { CommitPanel } from "./CommitPanel";
import { CloseCommitWindowPanel } from "./CloseCommitWindowPanel";
import { RevealPanel } from "./RevealPanel";
import { ClearingPendingPanel } from "./ClearingPendingPanel";
import { ChallengePanel } from "./ChallengePanel";
import { SettledPanel } from "./SettledPanel";

const CARD = {
  background: "var(--color-app-surface)",
  border: "1px solid var(--color-app-border)",
};

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

  const { decimals: paymentDecimals } = usePaymentTokenDecimals();
  const { symbol: paymentSymbol } = usePaymentTokenSymbol();
  const now = useNowSeconds();

  if (isLoading && state === undefined) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-48 animate-pulse rounded-xl"
            style={{ background: "var(--color-app-surface)" }}
          />
        ))}
      </div>
    );
  }

  let activeDeadline: bigint | undefined;
  if (state === ISSUANCE_STATE.COMMIT_OPEN) activeDeadline = params?.commitWindowEnd;
  else if (state === ISSUANCE_STATE.REVEAL_OPEN) activeDeadline = params?.revealWindowEnd;

  const commitWindowElapsed =
    state === ISSUANCE_STATE.COMMIT_OPEN && params !== undefined && now >= params.commitWindowEnd;
  const revealWindowElapsed =
    state === ISSUANCE_STATE.REVEAL_OPEN && params !== undefined && now >= params.revealWindowEnd;

  const tokenLabel = tokenName && tokenSymbol
    ? `${String(tokenName)} · ${String(tokenSymbol)}`
    : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main action column */}
      <div className="lg:col-span-2 space-y-5">
        {/* Title card */}
        <div className="rounded-xl p-5" style={CARD}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-semibold" style={{ color: "var(--color-app-text)" }}>
                  {tokenLabel || "Sealed-Bid Offering"}
                </h2>
                {state !== undefined && <StateBadge state={state} />}
              </div>
              <div className="text-xs font-mono mt-1" style={{ color: "var(--color-app-muted)" }}>
                {address}
              </div>
            </div>
            {activeDeadline !== undefined && (
              <div className="text-right">
                <div className="text-xs" style={{ color: "var(--color-app-muted)" }}>
                  Phase Deadline
                </div>
                <CountdownTimer deadline={activeDeadline} className="text-base font-semibold mt-0.5" />
              </div>
            )}
          </div>
        </div>

        {/* State-specific action panel */}
        {state === ISSUANCE_STATE.COMMIT_OPEN &&
          (commitWindowElapsed ? <CloseCommitWindowPanel /> : <CommitPanel />)}
        {state === ISSUANCE_STATE.REVEAL_OPEN &&
          (revealWindowElapsed ? <ClearingPendingPanel /> : <RevealPanel />)}
        {state === ISSUANCE_STATE.CLEARING_PENDING && <ClearingPendingPanel />}
        {state === ISSUANCE_STATE.CHALLENGE_OPEN && <ChallengePanel />}
        {(state === ISSUANCE_STATE.SETTLED || state === ISSUANCE_STATE.CANCELLED) && (
          <SettledPanel />
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-5">
        {/* Your Info card (Aave-style) */}
        <div className="rounded-xl p-5 space-y-4" style={CARD}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--color-app-text)" }}>Offering Parameters</h3>

          {params ? (
            <div className="space-y-3 text-sm">
              {[
                { label: "Total Supply", value: `${formatAmount(params.supply)} tokens` },
                {
                  label: "Reserve Price",
                  value:
                    paymentDecimals !== undefined
                      ? `${formatPrice(params.reservePrice, paymentDecimals)} ${paymentSymbol ?? ""}`
                      : "…",
                },
                { label: "Per-Bidder Cap", value: `${params.capBps / 100}%` },
                { label: "Min Holders", value: params.minHolders.toString() },
                {
                  label: "Min Bond",
                  value:
                    paymentDecimals !== undefined
                      ? `${formatPrice(params.minBond, paymentDecimals)} ${paymentSymbol ?? ""}`
                      : "…",
                },
                {
                  label: "Issuer",
                  value: issuerAddress
                    ? `${(issuerAddress as string).slice(0, 8)}...${(issuerAddress as string).slice(-6)}`
                    : "—",
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-4">
                  <span style={{ color: "var(--color-app-muted)" }}>{label}</span>
                  <span className="font-medium text-right" style={{ color: "var(--color-app-text)" }}>{value}</span>
                </div>
              ))}

              <div
                className="pt-3 mt-1 space-y-2"
                style={{ borderTop: "1px solid var(--color-app-border)" }}
              >
                <div className="text-xs font-medium" style={{ color: "var(--color-app-text)" }}>Timeline</div>
                {[
                  { label: "Commit Ends", value: formatTimestamp(params.commitWindowEnd) },
                  { label: "Reveal Ends", value: formatTimestamp(params.revealWindowEnd) },
                  {
                    label: "Challenge Window",
                    value: `${Number(params.challengeWindowLength) / 60} min`,
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-4 text-xs">
                    <span style={{ color: "var(--color-app-muted)" }}>{label}</span>
                    <span style={{ color: "var(--color-app-muted-2)" }} className="text-right">{value}</span>
                  </div>
                ))}
              </div>

              {approvedAttestors && approvedAttestors.length > 0 && (
                <div
                  className="pt-3 mt-1 space-y-1.5"
                  style={{ borderTop: "1px solid var(--color-app-border)" }}
                >
                  <div className="text-xs font-medium" style={{ color: "var(--color-app-text)" }}>
                    Attestors ({approvedAttestors.length})
                  </div>
                  {approvedAttestors.map((att: string, idx: number) => (
                    <div
                      key={idx}
                      className="text-[11px] font-mono truncate"
                      style={{ color: "var(--color-app-muted)" }}
                    >
                      {att}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div
              className="text-sm text-center py-6"
              style={{ color: "var(--color-app-muted)" }}
            >
              Loading parameters…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
