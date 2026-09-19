import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { isAddress, zeroAddress } from "viem";
import { useIssuanceBids } from "../hooks/useIssuanceBids";
import { useIssuanceState } from "../../issuance-detail/hooks/useIssuanceState";
import { useIssuances } from "../../issuance-discovery/hooks/useIssuances";
import { clear } from "../../../solver/clear";
import type { Bid as SolverBid, ClearResult } from "../../../solver/types";
import { IssuanceAbi, DemoUSDAddress, DemoUSDAbi } from "../../../contracts";
import { StateBadge } from "../../../components/ui/StateBadge";
import { formatDUSD, formatUnits } from "../../../lib/format";
import { getRevertReason } from "../../../lib/revertReasons";

export function ClearingWorkbench() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialAddress = searchParams.get("issuance") || "";
  const [selectedAddress, setSelectedAddress] = useState(initialAddress);

  const { address: walletAddress } = useAccount();
  const { issuances: allIssuances } = useIssuances();
  const validAddress = isAddress(selectedAddress) ? (selectedAddress as `0x${string}`) : undefined;

  const issuanceState = useIssuanceState(validAddress || zeroAddress, walletAddress);
  const { bids, isLoading: loadingBids } = useIssuanceBids(validAddress);

  const [solverResult, setSolverResult] = useState<ClearResult | null>(null);
  const [solvingError, setSolvingError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  // Check DemoUSD allowance for solver bond
  const { data: bondAllowance } = useReadContract({
    address: DemoUSDAddress,
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

  // Construct allocations array [b0, b1, ..., bn-1] for contract call
  const allocationsArray = useMemo(() => {
    if (!solverResult || solverResult.kind !== "cleared") return [];
    return bids.map((b) => solverResult.allocations.get(b.bidder) ?? 0n);
  }, [solverResult, bids]);

  const handleProposeClearing = useCallback(async () => {
    if (!validAddress || !solverResult || !publicClient || !issuanceState.params) return;
    setSubmitting(true);
    setTxError(null);

    try {
      const minBond = issuanceState.params.minBond;

      // Approve bond payment token if needed
      if (minBond > 0n && DemoUSDAddress && (!bondAllowance || bondAllowance < minBond)) {
        const appHash = await writeContractAsync({
          address: DemoUSDAddress,
          abi: DemoUSDAbi,
          functionName: "approve",
          args: [validAddress, minBond * 10n],
        });
        await publicClient.waitForTransactionReceipt({ hash: appHash });
      }

      let hash: `0x${string}`;
      if (solverResult.kind === "unresolved") {
        hash = await writeContractAsync({
          address: validAddress,
          abi: IssuanceAbi,
          functionName: "proposeUnresolvedClearing",
          args: [minBond],
        });
      } else {
        hash = await writeContractAsync({
          address: validAddress,
          abi: IssuanceAbi,
          functionName: "proposeClearing",
          args: [solverResult.price, allocationsArray, minBond],
        });
      }

      await publicClient.waitForTransactionReceipt({ hash });
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
    issuanceState,
    bondAllowance,
    writeContractAsync,
    allocationsArray,
  ]);

  const handleChallengeClearing = useCallback(async () => {
    if (!validAddress || !solverResult || solverResult.kind !== "cleared" || !publicClient || !issuanceState.params)
      return;

    setSubmitting(true);
    setTxError(null);

    try {
      const minBond = issuanceState.params.minBond;

      if (minBond > 0n && DemoUSDAddress && (!bondAllowance || bondAllowance < minBond)) {
        const appHash = await writeContractAsync({
          address: DemoUSDAddress,
          abi: DemoUSDAbi,
          functionName: "approve",
          args: [validAddress, minBond * 10n],
        });
        await publicClient.waitForTransactionReceipt({ hash: appHash });
      }

      const hash = await writeContractAsync({
        address: validAddress,
        abi: IssuanceAbi,
        functionName: "challengeClearing",
        args: [solverResult.price, allocationsArray, minBond],
      });

      await publicClient.waitForTransactionReceipt({ hash });
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
    issuanceState,
    bondAllowance,
    writeContractAsync,
    allocationsArray,
  ]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="border-b border-white/10 pb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">Clearing Solver Workbench</h1>
        <p className="text-sm text-slate-400 mt-1">
          Permissionless auction solver interface. Run the uniform-price clearing algorithm on revealed bids to propose or challenge a clearing outcome.
        </p>
      </div>

      {/* Target Issuance Selector */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Target Offering Contract
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Paste offering contract address (0x...)"
            value={selectedAddress}
            onChange={(e) => handleSelectIssuance(e.target.value)}
            className="flex-1 rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-accent"
          />
          {allIssuances.length > 0 && (
            <select
              onChange={(e) => handleSelectIssuance(e.target.value)}
              value={selectedAddress}
              className="rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
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
            <span className="text-xs text-slate-400">Current On-Chain State:</span>
            <StateBadge state={issuanceState.state} />
          </div>
        )}
      </div>

      {validAddress && (
        <div className="space-y-8">
          {/* Section: Bids Table */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Revealed Bids ({bids.length})
              </h3>
              <button
                onClick={handleRunSolver}
                disabled={loadingBids || bids.length === 0}
                className="px-4 py-2 rounded-lg bg-accent text-black font-semibold text-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                Run Off-Chain Solver
              </button>
            </div>

            {loadingBids ? (
              <div className="h-32 bg-white/5 rounded-lg animate-pulse" />
            ) : bids.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-slate-500 text-sm">
                No revealed bids found for this offering.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-white/5 text-xs text-slate-400 uppercase font-medium">
                    <tr>
                      <th className="px-4 py-3 rounded-l-lg">#</th>
                      <th className="px-4 py-3">Bidder</th>
                      <th className="px-4 py-3 text-right">Quantity</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3 text-center">Eligible</th>
                      <th className="px-4 py-3 text-right rounded-r-lg">Escrow Locked</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs font-mono">
                    {bids.map((b) => (
                      <tr key={b.index} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-slate-500">{b.index}</td>
                        <td className="px-4 py-3 text-white">{b.bidder}</td>
                        <td className="px-4 py-3 text-right font-sans">{formatUnits(b.qty, 18)}</td>
                        <td className="px-4 py-3 text-right font-sans">{formatDUSD(b.price)}</td>
                        <td className="px-4 py-3 text-center">
                          {b.eligible ? (
                            <span className="text-emerald-400 font-sans text-xs">Yes</span>
                          ) : (
                            <span className="text-red-400 font-sans text-xs">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-sans">{formatDUSD(b.escrow)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section: Solver Output & Actions */}
          {solvingError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
              Solver error: {solvingError}
            </div>
          )}

          {txError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
              Transaction error: {txError}
            </div>
          )}

          {solverResult && (
            <div className="rounded-xl border border-accent/20 bg-accent/[0.02] p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-lg font-semibold text-white">Solver Outcome</h3>
                <span className={`px-2.5 py-1 rounded text-xs font-semibold ${
                  solverResult.kind === "cleared" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                }`}>
                  {solverResult.kind.toUpperCase()}
                </span>
              </div>

              {solverResult.kind === "unresolved" ? (
                <div className="space-y-4">
                  <p className="text-sm text-slate-300">
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-lg bg-black/30 p-4 border border-white/10 text-sm">
                    <div>
                      <div className="text-slate-400 text-xs">Clearing Price</div>
                      <div className="text-accent font-bold text-lg mt-1">
                        {formatDUSD(solverResult.price)} / token
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-xs">Winning Bidders</div>
                      <div className="text-white font-semibold text-lg mt-1">
                        {solverResult.allocations.size}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-xs">Total Allocated</div>
                      <div className="text-white font-semibold text-lg mt-1">
                        {formatUnits(
                          Array.from(solverResult.allocations.values()).reduce((a, b) => a + b, 0n),
                          18
                        )}{" "}
                        tokens
                      </div>
                    </div>
                  </div>

                  {/* Allocations Table */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Computed Allocations
                    </h4>
                    <div className="overflow-x-auto rounded-lg border border-white/5 bg-black/20">
                      <table className="w-full text-left text-xs font-mono text-slate-300">
                        <thead className="bg-white/5 text-slate-400">
                          <tr>
                            <th className="px-4 py-2">Bidder Address</th>
                            <th className="px-4 py-2 text-right">Allocated Tokens</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {Array.from(solverResult.allocations.entries()).map(([addr, qty]) => (
                            <tr key={addr}>
                              <td className="px-4 py-2 text-white">{addr}</td>
                              <td className="px-4 py-2 text-right font-sans font-medium text-emerald-400">
                                {formatUnits(qty, 18)}
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
                        className="px-6 py-2.5 rounded-lg bg-accent text-black font-semibold text-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
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
