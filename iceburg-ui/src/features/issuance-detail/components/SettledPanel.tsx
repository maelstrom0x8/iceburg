import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { useState, useCallback } from "react";
import { IssuanceAbi, SecurityTokenAbi } from "../../../contracts";
import { useIssuanceContext } from "../context/IssuanceContext";
import { formatDUSD, formatUnits } from "../../../lib/format";
import { getRevertReason } from "../../../lib/revertReasons";

const INSET = {
  background: "var(--color-app-surface-2)",
  border: "1px solid var(--color-app-border)",
};

export function SettledPanel() {
  const { address, state, params, standingProposal, refetch } = useIssuanceContext();
  const { address: walletAddress } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [acting, setActing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: issuerAddress } = useReadContract({
    address,
    abi: IssuanceAbi,
    functionName: "issuer",
  });

  const securityTokenAddress = params?.securityToken;

  const { data: tokenSymbol } = useReadContract({
    address: securityTokenAddress,
    abi: SecurityTokenAbi,
    functionName: "symbol",
    query: { enabled: Boolean(securityTokenAddress) },
  });

  const { data: userTokenBalance } = useReadContract({
    address: securityTokenAddress,
    abi: SecurityTokenAbi,
    functionName: "balanceOf",
    args: walletAddress ? [walletAddress] : undefined,
    query: { enabled: Boolean(securityTokenAddress && walletAddress) },
  });

  const isIssuer =
    walletAddress &&
    issuerAddress &&
    walletAddress.toLowerCase() === (issuerAddress as string).toLowerCase();
  const isCancelled = state === 5;

  const handleCancelUnresolved = useCallback(async () => {
    if (!publicClient) return;
    setActing(true);
    setErrorMsg(null);
    try {
      const hash = await writeContractAsync({
        address,
        abi: IssuanceAbi,
        functionName: "cancelUnresolved",
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await refetch();
    } catch (err) {
      setErrorMsg(getRevertReason(err));
    } finally {
      setActing(false);
    }
  }, [address, publicClient, refetch, writeContractAsync]);

  if (isCancelled) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-6 space-y-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-medium border border-red-500/20">
            Cancelled
          </div>
          <h3 className="text-xl font-semibold" style={{ color: "var(--color-app-text)" }}>
            Offering Cancelled
          </h3>
          <p className="text-sm" style={{ color: "var(--color-app-muted)" }}>
            This offering was cancelled because no valid clearing proposal could be resolved or
            an unresolved claim was accepted. All bidder escrow and bonds are available for claim.
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-lg p-3 text-sm border border-red-500/30 bg-red-500/10 text-red-500">
            {errorMsg}
          </div>
        )}

        {isIssuer && (
          <button
            onClick={handleCancelUnresolved}
            disabled={acting}
            className="px-4 py-2.5 rounded-lg text-sm font-medium border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            {acting ? "Cancelling…" : "Cancel Unresolved Offering"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-6 space-y-4">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium border border-emerald-500/20">
          Settled
        </div>
        <h3 className="text-xl font-semibold" style={{ color: "var(--color-app-text)" }}>
          Offering Finalized & Settled
        </h3>
        <p className="text-sm" style={{ color: "var(--color-app-muted)" }}>
          The auction outcome has been on-chain executed. Token allocations have been minted to
          winning bidders and refunds processed.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-lg p-4 text-sm" style={INSET}>
        <div>
          <div className="text-xs mb-1" style={{ color: "var(--color-app-muted)" }}>Final Clearing Price</div>
          <div className="font-semibold text-lg text-emerald-500">
            {standingProposal ? formatDUSD(standingProposal.clearingPrice) : "—"} / token
          </div>
        </div>
        <div>
          <div className="text-xs mb-1" style={{ color: "var(--color-app-muted)" }}>Security Token</div>
          <div className="font-mono text-xs truncate" style={{ color: "var(--color-app-text)" }}>
            {securityTokenAddress || "—"}
          </div>
        </div>
        <div>
          <div className="text-xs mb-1" style={{ color: "var(--color-app-muted)" }}>Your Token Balance</div>
          <div className="font-medium" style={{ color: "var(--color-app-text)" }}>
            {userTokenBalance !== undefined
              ? `${formatUnits(userTokenBalance as bigint, 18)} ${tokenSymbol ? String(tokenSymbol) : ""}`
              : "Connect wallet to view"}
          </div>
        </div>
      </div>
    </div>
  );
}
