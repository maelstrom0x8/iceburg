import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { useState, useCallback } from "react";
import type { Abi } from "viem";
import { IssuanceAbi, SecurityTokenAbi } from "../../../contracts";
import { useIssuanceContext } from "../context/IssuanceContext";
import { formatAmount, formatPrice } from "../../../lib/format";
import { usePaymentTokenDecimals } from "../../../hooks/usePaymentTokenDecimals";
import { usePaymentTokenSymbol } from "../../../hooks/usePaymentTokenSymbol";
import { getRevertReason } from "../../../lib/revertReasons";
import { waitForSuccessfulReceipt } from "../../../lib/waitForSuccessfulReceipt";
import { writeWithFeeBuffer } from "../../../lib/writeWithFeeBuffer";

const INSET = {
  background: "var(--color-app-surface-2)",
  border: "1px solid var(--color-app-border)",
};

function ClaimSection({ issuanceAddress }: { issuanceAddress: `0x${string}` }) {
  const { address: walletAddress } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { params } = useIssuanceContext();
  const { decimals: paymentDecimals } = usePaymentTokenDecimals(params?.paymentToken);
  const { symbol: paymentSymbol } = usePaymentTokenSymbol(params?.paymentToken);

  const [claiming, setClaiming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    data: claimableAmount,
    refetch: refetchClaimable,
  } = useReadContract({
    address: issuanceAddress,
    abi: IssuanceAbi,
    functionName: "claimable",
    args: walletAddress ? [walletAddress] : undefined,
    query: { enabled: Boolean(walletAddress) },
  });

  const handleClaim = useCallback(async () => {
    if (!publicClient || !walletAddress) return;
    setClaiming(true);
    setErrorMsg(null);
    try {
      const callParams = { address: issuanceAddress, abi: IssuanceAbi as Abi, functionName: "claim" };
      const hash = await writeWithFeeBuffer(writeContractAsync, publicClient, callParams);
      await waitForSuccessfulReceipt(publicClient, hash, callParams, walletAddress);
      await refetchClaimable();
    } catch (err) {
      setErrorMsg(getRevertReason(err));
    } finally {
      setClaiming(false);
    }
  }, [issuanceAddress, publicClient, walletAddress, refetchClaimable, writeContractAsync]);

  if (!walletAddress) {
    return (
      <p className="text-sm" style={{ color: "var(--color-app-muted)" }}>
        Connect your wallet to check what you're owed.
      </p>
    );
  }

  const amount = (claimableAmount as bigint | undefined) ?? 0n;

  return (
    <div className="space-y-3">
      {errorMsg && (
        <div className="rounded-lg p-3 text-sm border border-red-500/30 bg-red-500/10 text-red-500">
          {errorMsg}
        </div>
      )}

      {amount > 0n ? (
        <button
          onClick={handleClaim}
          disabled={claiming}
          className="px-4 py-2.5 rounded-lg text-sm font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
        >
          {claiming
            ? "Claiming…"
            : `Claim ${paymentDecimals !== undefined ? `${formatPrice(amount, paymentDecimals)} ${paymentSymbol ?? ""}` : "your funds"}`}
        </button>
      ) : (
        <p className="text-sm" style={{ color: "var(--color-app-muted)" }}>
          Nothing left to claim for this wallet — either you weren't owed
          anything from this offering, or you've already claimed it.
        </p>
      )}
    </div>
  );
}

export function SettledPanel() {
  const { address, state, finalized, params, standingProposal, refetch } = useIssuanceContext();
  const { address: walletAddress } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [acting, setActing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const { decimals: paymentDecimals } = usePaymentTokenDecimals(params?.paymentToken);
  const { symbol: paymentSymbol } = usePaymentTokenSymbol(params?.paymentToken);

  const isCancelled = state === 5;

  const handleCancelUnresolved = useCallback(async () => {
    if (!publicClient || !walletAddress) return;
    setActing(true);
    setErrorMsg(null);
    try {
      const callParams = { address, abi: IssuanceAbi as Abi, functionName: "cancelUnresolved" };
      const hash = await writeWithFeeBuffer(writeContractAsync, publicClient, callParams);
      await waitForSuccessfulReceipt(publicClient, hash, callParams, walletAddress);
      await refetch();
    } catch (err) {
      setErrorMsg(getRevertReason(err));
    } finally {
      setActing(false);
    }
  }, [address, publicClient, walletAddress, refetch, writeContractAsync]);

  const handleSettle = useCallback(async () => {
    if (!publicClient || !walletAddress) return;
    setActing(true);
    setErrorMsg(null);
    try {
      const callParams = { address, abi: IssuanceAbi as Abi, functionName: "settle" };
      const hash = await writeWithFeeBuffer(writeContractAsync, publicClient, callParams);
      await waitForSuccessfulReceipt(publicClient, hash, callParams, walletAddress);
      await refetch();
    } catch (err) {
      setErrorMsg(getRevertReason(err));
    } finally {
      setActing(false);
    }
  }, [address, publicClient, walletAddress, refetch, writeContractAsync]);

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
            This offering was cancelled — either no valid clearing proposal could ever satisfy
            its requirements, or nobody submitted one before the proposal window timed out.
            {finalized
              ? " All bidder escrow and bonds are available for claim below."
              : " Once finalized, bidder escrow and bonds will be available to claim below."}
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-lg p-3 text-sm border border-red-500/30 bg-red-500/10 text-red-500">
            {errorMsg}
          </div>
        )}

        {/* cancelUnresolved is permissionless on-chain, same as settle() below
            — gating it to the issuer here would contradict the contract's
            own liveness design (anyone can finalize a cancelled offering). */}
        {!finalized && (
          <button
            onClick={handleCancelUnresolved}
            disabled={acting}
            className="px-4 py-2.5 rounded-lg text-sm font-medium border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            {acting ? "Cancelling…" : "Cancel Unresolved Offering"}
          </button>
        )}

        {finalized && <ClaimSection issuanceAddress={address} />}
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
          {finalized
            ? "The auction has settled on-chain. Winners' tokens have been minted; anyone owed a refund, proceeds, or bond back can claim it below."
            : "The auction outcome is decided. Settlement still needs to be finalized on-chain before anyone can claim their tokens, refund, or bond."}
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-lg p-3 text-sm border border-red-500/30 bg-red-500/10 text-red-500">
          {errorMsg}
        </div>
      )}

      {!finalized && (
        <button
          onClick={handleSettle}
          disabled={acting}
          className="px-4 py-2.5 rounded-lg text-sm font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
        >
          {acting ? "Finalizing…" : "Finalize Settlement"}
        </button>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-lg p-4 text-sm" style={INSET}>
        <div>
          <div className="text-xs mb-1" style={{ color: "var(--color-app-muted)" }}>Final Clearing Price</div>
          <div className="font-semibold text-lg text-emerald-500">
            {standingProposal && paymentDecimals !== undefined
              ? `${formatPrice(standingProposal.clearingPrice, paymentDecimals)} ${paymentSymbol ?? ""} / token`
              : "—"}
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
              ? `${formatAmount(userTokenBalance as bigint)} ${tokenSymbol ? String(tokenSymbol) : ""}`
              : "Connect wallet to view"}
          </div>
        </div>
      </div>

      {finalized && <ClaimSection issuanceAddress={address} />}
    </div>
  );
}
