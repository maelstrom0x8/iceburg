import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { useState, useCallback } from "react";
import { IssuanceAbi, SecurityTokenAbi } from "../../../contracts";
import { useIssuanceContext } from "../context/IssuanceContext";
import { formatDUSD, formatUnits } from "../../../lib/format";
import { getRevertReason } from "../../../lib/revertReasons";

export function SettledPanel() {
  const { address, state, params, standingProposal, refetch } = useIssuanceContext();
  const { address: walletAddress } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [acting, setActing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Read issuer
  const { data: issuerAddress } = useReadContract({
    address,
    abi: IssuanceAbi,
    functionName: "issuer",
  });

  const securityTokenAddress = params?.securityToken;

  // Read token symbol if settled
  const { data: tokenSymbol } = useReadContract({
    address: securityTokenAddress,
    abi: SecurityTokenAbi,
    functionName: "symbol",
    query: { enabled: Boolean(securityTokenAddress) },
  });

  // Read user's token balance if settled
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
      <div className="rounded-xl border border-red-500/20 bg-red-500/[0.02] p-6 space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20">
            Cancelled
          </div>
          <h3 className="text-xl font-semibold text-white">Offering Cancelled</h3>
          <p className="text-sm text-slate-400">
            This offering was cancelled because no valid clearing proposal could be resolved or an unresolved claim was accepted. All bidder escrow and bonds are available for claim.
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            {errorMsg}
          </div>
        )}

        {isIssuer && (
          <button
            onClick={handleCancelUnresolved}
            disabled={acting}
            className="px-4 py-2.5 rounded-lg text-sm font-medium bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 transition-colors disabled:opacity-50"
          >
            {acting ? "Cancelling..." : "Cancel Unresolved Offering"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.02] p-6 space-y-6">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
          Settled
        </div>
        <h3 className="text-xl font-semibold text-white">Offering Finalized & Settled</h3>
        <p className="text-sm text-slate-400">
          The auction outcome has been on-chain executed. Token allocations have been minted to winning bidders and refunds processed.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-lg bg-black/20 p-4 border border-white/5 text-sm">
        <div>
          <div className="text-slate-400 text-xs">Final Clearing Price</div>
          <div className="text-emerald-400 font-semibold text-lg mt-1">
            {standingProposal ? formatDUSD(standingProposal.clearingPrice) : "—"} / token
          </div>
        </div>
        <div>
          <div className="text-slate-400 text-xs">Security Token</div>
          <div className="text-white font-mono text-xs truncate mt-1">
            {securityTokenAddress || "—"}
          </div>
        </div>
        <div>
          <div className="text-slate-400 text-xs">Your Token Balance</div>
          <div className="text-white font-medium mt-1">
            {userTokenBalance !== undefined
              ? `${formatUnits(userTokenBalance as bigint, 18)} ${tokenSymbol ? String(tokenSymbol) : ""}`
              : "Connect wallet to view"}
          </div>
        </div>
      </div>
    </div>
  );
}
