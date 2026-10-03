import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { isAddress, zeroAddress, type Abi } from "viem";
import { useIssuanceBids } from "../hooks/useIssuanceBids";
import { useIssuanceState } from "../../issuance-detail/hooks/useIssuanceState";
import { useIssuances } from "../../issuance-discovery/hooks/useIssuances";
import { useIsTrustedIssuance } from "../../issuance-discovery/hooks/useIsTrustedIssuance";
import { clear } from "../../../solver/clear";
import type { Bid as SolverBid, ClearResult } from "../../../solver/types";
import { IssuanceAbi, DemoUSDAbi } from "../../../contracts";
import { usePaymentTokenDecimals } from "../../../hooks/usePaymentTokenDecimals";
import { usePaymentTokenSymbol } from "../../../hooks/usePaymentTokenSymbol";
import { StateBadge } from "../../../components/ui/StateBadge";
import { formatAmount, formatPrice } from "../../../lib/format";
import { getRevertReason } from "../../../lib/revertReasons";
import { waitForSuccessfulReceipt } from "../../../lib/waitForSuccessfulReceipt";
import { writeWithFeeBuffer } from "../../../lib/writeWithFeeBuffer";

export function ClearingWorkbench() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialAddress = searchParams.get("issuance") || "";
  const [selectedAddress, setSelectedAddress] = useState(initialAddress);

  const { address: walletAddress } = useAccount();
  const { issuances: allIssuances } = useIssuances();
  const validAddress = isAddress(selectedAddress) ? selectedAddress : undefined;
  const { isTrusted: targetIsTrusted, isLoading: trustLoading } = useIsTrustedIssuance(validAddress);

  const issuanceState = useIssuanceState(validAddress || zeroAddress, walletAddress);
  const { bids, isLoading: loadingBids, error: bidsError } = useIssuanceBids(validAddress);

  const [solverResult, setSolverResult] = useState<ClearResult | null>(null);
  const [solvingError, setSolvingError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const paymentTokenAddress = issuanceState.params?.paymentToken;
  const { decimals } = usePaymentTokenDecimals(paymentTokenAddress);
  const { symbol } = usePaymentTokenSymbol(paymentTokenAddress);

  const { data: bondAllowance } = useReadContract({
    address: paymentTokenAddress,
    abi: DemoUSDAbi,
    functionName: "allowance",
    args: walletAddress && validAddress ? [walletAddress, validAddress] : undefined,
    query: { enabled: Boolean(walletAddress && validAddress) },
  });

  const handleSelectIssuance = (addr: string) => {
    setSelectedAddress(addr);
    setSearchParams(addr ? { issuance: addr } : {});
    setSolverResult(null);
    setSolvingError(null);
    setTxError(null);
  };

  const handleRunSolver = useCallback(() => {
    setSolvingError(null);
    setSolverResult(null);

    if (!issuanceState.params) {
      setSolvingError("Offering parameters not loaded.");
      return;
    }

    try {
      const solverBids: SolverBid[] = bids.map((b) => ({
        bidder: b.bidder,
        qty: b.qty,
        price: b.price,
        eligible: b.eligible,
        escrow: b.escrow,
      }));

      const solverParams = {
        supply: issuanceState.params.supply,
        reservePrice: issuanceState.params.reservePrice,
        cap: (issuanceState.params.supply * BigInt(issuanceState.params.capBps)) / 10000n,
        minHolders: BigInt(issuanceState.params.minHolders),
        minBond: issuanceState.params.minBond,
      };

      const result = clear(solverBids, solverParams);
      setSolverResult(result);
    } catch (err) {
      setSolvingError(err instanceof Error ? err.message : String(err));
    }
  }, [bids, issuanceState.params]);

  const allocationsArray = useMemo(() => {
    if (!solverResult || solverResult.kind !== "cleared") return [];
    return bids.map((b) => solverResult.allocations.get(b.bidder) ?? 0n);
  }, [solverResult, bids]);

  const handleProposeClearing = useCallback(async () => {
    if (!validAddress || !solverResult || !publicClient || !issuanceState.params || !walletAddress) return;
    if (!targetIsTrusted) {
      setTxError("This contract was not created by the Iceburg factory — refusing to approve or submit to it.");
      return;
    }
    setSubmitting(true);
    setTxError(null);

    try {
      const minBond = issuanceState.params.minBond;

      if (minBond > 0n && paymentTokenAddress && (!bondAllowance || bondAllowance < minBond)) {
        const approveParams = {
          address: paymentTokenAddress,
          abi: DemoUSDAbi as Abi,
          functionName: "approve",
          args: [validAddress, minBond * 10n],
        };
        const appHash = await writeWithFeeBuffer(writeContractAsync, publicClient, approveParams);
        await waitForSuccessfulReceipt(publicClient, appHash, approveParams, walletAddress);
      }

      const callParams =
        solverResult.kind === "unresolved"
          ? {
              address: validAddress,
              abi: IssuanceAbi as Abi,
              functionName: "proposeUnresolvedClearing",
              args: [minBond],
            }
          : {
              address: validAddress,
              abi: IssuanceAbi as Abi,
              functionName: "proposeClearing",
              args: [solverResult.price, allocationsArray, minBond],
            };
      const hash = await writeWithFeeBuffer(writeContractAsync, publicClient, callParams);

      await waitForSuccessfulReceipt(publicClient, hash, callParams, walletAddress);
      await issuanceState.refetch();
    } catch (err) {
      setTxError(getRevertReason(err));
    } finally {
      setSubmitting(false);
    }
  }, [
    validAddress,
    solverResult,
    publicClient,
    walletAddress,
    issuanceState,
    bondAllowance,
    writeContractAsync,
    allocationsArray,
    paymentTokenAddress,
    targetIsTrusted,
  ]);

  const handleChallengeClearing = useCallback(async () => {
    if (
      !validAddress || !solverResult || solverResult.kind !== "cleared" ||
      !publicClient || !issuanceState.params || !walletAddress
    )
      return;
    if (!targetIsTrusted) {
      setTxError("This contract was not created by the Iceburg factory — refusing to approve or submit to it.");
      return;
    }

    setSubmitting(true);
    setTxError(null);

    try {
      const minBond = issuanceState.params.minBond;

      if (minBond > 0n && paymentTokenAddress && (!bondAllowance || bondAllowance < minBond)) {
        const approveParams = {
          address: paymentTokenAddress,
          abi: DemoUSDAbi as Abi,
          functionName: "approve",
          args: [validAddress, minBond * 10n],
        };
        const appHash = await writeWithFeeBuffer(writeContractAsync, publicClient, approveParams);
        await waitForSuccessfulReceipt(publicClient, appHash, approveParams, walletAddress);
      }

      const callParams = {
        address: validAddress,
        abi: IssuanceAbi as Abi,
        functionName: "challengeClearing",
        args: [solverResult.price, allocationsArray, minBond],
      };
      const hash = await writeWithFeeBuffer(writeContractAsync, publicClient, callParams);

      await waitForSuccessfulReceipt(publicClient, hash, callParams, walletAddress);
      await issuanceState.refetch();
    } catch (err) {
      setTxError(getRevertReason(err));
    } finally {
      setSubmitting(false);
    }
  }, [
    validAddress,
    solverResult,
    publicClient,
    walletAddress,
    issuanceState,
    bondAllowance,
    writeContractAsync,
    allocationsArray,
    paymentTokenAddress,
    targetIsTrusted,
  ]);

  const surfaceStyle = {
    background: "var(--color-app-surface)",
    border: "1px solid var(--color-app-border)",
  };

  const inputStyle = {
    background: "var(--color-app-surface-2)",
    border: "1px solid var(--color-app-border)",
    color: "var(--color-app-text)",
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div style={{ borderBottom: "1px solid var(--color-app-border)" }} className="pb-4">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-app-text)" }}>
          Clearing Solver Workbench
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-app-muted)" }}>
          Permissionless auction solver interface. Run the uniform-price clearing algorithm on revealed bids to propose or challenge a clearing outcome.
        </p>
      </div>

      {/* Target Issuance Selector */}
      <div className="rounded-xl p-6 space-y-4" style={surfaceStyle}>
        <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-app-muted)" }}>
          Target Offering Contract
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Paste offering contract address (0x...)"
            value={selectedAddress}
            onChange={(e) => handleSelectIssuance(e.target.value)}
            className="flex-1 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent"
            style={inputStyle}
          />
          {allIssuances.length > 0 && (
            <select
              onChange={(e) => handleSelectIssuance(e.target.value)}
              value={selectedAddress}
              className="rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              style={inputStyle}
            >
              <option value="">Select from active list...</option>
              {allIssuances.map((item) => (
                <option key={item.issuanceAddress} value={item.issuanceAddress}>
                  {item.tokenName || "Offering"} ({item.issuanceAddress.slice(0, 8)}...)
                </option>
              ))}
            </select>
          )}
        </div>

        {validAddress && issuanceState.state !== undefined && (
          <div className="flex items-center gap-3 pt-2">
            <span className="text-xs" style={{ color: "var(--color-app-muted)" }}>Current On-Chain State:</span>
            <StateBadge state={issuanceState.state} />
          </div>
        )}

        {validAddress && !trustLoading && !targetIsTrusted && (
          <div className="rounded-lg p-3 text-sm" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
            This contract was not created by the Iceburg factory on this network. Proposing,
            challenging, or approving a token spend to it is disabled.
          </div>
        )}
      </div>

      {validAddress && targetIsTrusted && (
        <div className="space-y-8">
          {/* Section: Bids Table */}
          <div className="rounded-xl p-6 space-y-4" style={surfaceStyle}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold" style={{ color: "var(--color-app-text)" }}>
                Revealed Bids ({bids.length})
              </h3>
              <button
                onClick={handleRunSolver}
                disabled={loadingBids || bids.length === 0}
                className="px-4 py-2 rounded-lg text-black font-semibold text-sm transition-colors disabled:opacity-50"
                style={{ background: "var(--color-accent)" }}
              >
                Run Off-Chain Solver
              </button>
            </div>

            {loadingBids ? (
              <div className="h-32 rounded-lg animate-pulse" style={{ background: "var(--color-app-surface-2)" }} />
            ) : bidsError ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center text-sm text-red-500">
                {bidsError.message}
              </div>
            ) : bids.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm" style={{ borderColor: "var(--color-app-border)", color: "var(--color-app-muted)" }}>
                No revealed bids found for this offering.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr style={{ background: "var(--color-app-surface-2)", borderBottom: "1px solid var(--color-app-border)" }}>
                      <th className="px-4 py-3 rounded-l-lg text-xs uppercase font-medium" style={{ color: "var(--color-app-muted)" }}>#</th>
                      <th className="px-4 py-3 text-xs uppercase font-medium" style={{ color: "var(--color-app-muted)" }}>Bidder</th>
                      <th className="px-4 py-3 text-right text-xs uppercase font-medium" style={{ color: "var(--color-app-muted)" }}>Quantity</th>
                      <th className="px-4 py-3 text-right text-xs uppercase font-medium" style={{ color: "var(--color-app-muted)" }}>Price</th>
                      <th className="px-4 py-3 text-center text-xs uppercase font-medium" style={{ color: "var(--color-app-muted)" }}>Eligible</th>
                      <th className="px-4 py-3 text-right text-xs uppercase font-medium" style={{ color: "var(--color-app-muted)" }}>Escrow Locked</th>
                      <th className="px-4 py-3 text-right rounded-r-lg text-xs uppercase font-medium" style={{ color: "var(--color-app-muted)" }}>Attestor</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-mono">
                    {bids.map((b) => (
                      <tr key={b.index} style={{ borderBottom: "1px solid var(--color-app-border)" }} className="hover:bg-[var(--color-app-surface-2)]">
                        <td className="px-4 py-3" style={{ color: "var(--color-app-muted)" }}>{b.index}</td>
                        <td className="px-4 py-3 font-mono" style={{ color: "var(--color-app-text)" }}>{b.bidder}</td>
                        <td className="px-4 py-3 text-right font-sans" style={{ color: "var(--color-app-text)" }}>{formatAmount(b.qty)}</td>
                        <td className="px-4 py-3 text-right font-sans" style={{ color: "var(--color-app-text)" }}>
                          {decimals !== undefined ? `${formatPrice(b.price, decimals)} ${symbol ?? ""}` : "…"}
                        </td>
                        <td className="px-4 py-3 text-center font-sans">
                          {b.eligible ? (
                            <span className="text-emerald-500 font-semibold text-xs">Yes</span>
                          ) : (
                            <span className="text-red-500 font-semibold text-xs">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-sans" style={{ color: "var(--color-app-text)" }}>
                          {decimals !== undefined ? `${formatPrice(b.escrow, decimals)} ${symbol ?? ""}` : "…"}
                        </td>
                        <td className="px-4 py-3 text-right" style={{ color: "var(--color-app-muted)" }} title={b.attestor}>
                          {b.attestor.slice(0, 6)}…{b.attestor.slice(-4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section: Solver Output & Actions */}
          {solvingError && (
            <div className="rounded-lg p-4 text-sm" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
              Solver error: {solvingError}
            </div>
          )}

          {txError && (
            <div className="rounded-lg p-4 text-sm" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
              Transaction error: {txError}
            </div>
          )}

          {solverResult && (
            <div className="rounded-xl p-6 space-y-6" style={surfaceStyle}>
              <div className="flex items-center justify-between pb-4" style={{ borderBottom: "1px solid var(--color-app-border)" }}>
                <h3 className="text-lg font-semibold" style={{ color: "var(--color-app-text)" }}>Solver Outcome</h3>
                <span className={`px-2.5 py-1 rounded text-xs font-semibold ${
                  solverResult.kind === "cleared" ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300" : "bg-amber-500/20 text-amber-600 dark:text-amber-300"
                }`}>
                  {solverResult.kind.toUpperCase()}
                </span>
              </div>

              {solverResult.kind === "unresolved" ? (
                <div className="space-y-4">
                  <p className="text-sm" style={{ color: "var(--color-app-text)" }}>
                    The auction could not clear (e.g. reserve price or minimum distinct holder count not satisfied). You may submit an Unresolved Clearing proposal on-chain.
                  </p>
                  <button
                    onClick={handleProposeClearing}
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition-colors disabled:opacity-50"
                  >
                    {submitting ? "Submitting Proposal..." : "Propose Unresolved Clearing"}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-lg p-4 text-sm" style={{ background: "var(--color-app-surface-2)", border: "1px solid var(--color-app-border)" }}>
                    <div>
                      <div className="text-xs" style={{ color: "var(--color-app-muted)" }}>Clearing Price</div>
                      <div className="font-bold text-lg mt-1" style={{ color: "var(--color-accent)" }}>
                        {decimals !== undefined ? `${formatPrice(solverResult.price, decimals)} ${symbol ?? ""} / token` : "…"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: "var(--color-app-muted)" }}>Winning Bidders</div>
                      <div className="font-semibold text-lg mt-1" style={{ color: "var(--color-app-text)" }}>
                        {solverResult.allocations.size}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: "var(--color-app-muted)" }}>Total Allocated</div>
                      <div className="font-semibold text-lg mt-1" style={{ color: "var(--color-app-text)" }}>
                        {formatAmount(
                          Array.from(solverResult.allocations.values()).reduce((a, b) => a + b, 0n),
                        )}{" "}
                        tokens
                      </div>
                    </div>
                  </div>

                  {/* Allocations Table */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-app-muted)" }}>
                      Computed Allocations
                    </h4>
                    <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--color-app-border)", background: "var(--color-app-surface-2)" }}>
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr style={{ borderBottom: "1px solid var(--color-app-border)" }}>
                            <th className="px-4 py-2" style={{ color: "var(--color-app-muted)" }}>Bidder Address</th>
                            <th className="px-4 py-2 text-right" style={{ color: "var(--color-app-muted)" }}>Allocated Tokens</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from(solverResult.allocations.entries()).map(([addr, qty]) => (
                            <tr key={addr} style={{ borderBottom: "1px solid var(--color-app-border)" }}>
                              <td className="px-4 py-2" style={{ color: "var(--color-app-text)" }}>{addr}</td>
                              <td className="px-4 py-2 text-right font-sans font-medium text-emerald-500">
                                {formatAmount(qty)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* On-chain Submit CTAs */}
                  <div className="pt-2">
                    {issuanceState.state === 2 && (
                      <button
                        onClick={handleProposeClearing}
                        disabled={submitting}
                        className="px-6 py-2.5 rounded-lg text-black font-semibold text-sm transition-colors disabled:opacity-50"
                        style={{ background: "var(--color-accent)" }}
                      >
                        {submitting ? "Submitting..." : "Submit Propose Clearing Tx"}
                      </button>
                    )}

                    {issuanceState.state === 3 && (
                      <button
                        onClick={handleChallengeClearing}
                        disabled={submitting}
                        className="px-6 py-2.5 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition-colors disabled:opacity-50"
                      >
                        {submitting ? "Submitting Challenge..." : "Submit Challenge Clearing Tx"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
