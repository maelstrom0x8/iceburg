import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { parseUnits, isAddress } from "viem";
import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { useLaunchOffering } from "../../../hooks/useLaunchOffering";
import { DemoUSDAddress, DemoUSDAbi, IssuanceFactoryAddress } from "../../../contracts";
import { getRevertReason } from "../../../lib/revertReasons";

export function LaunchForm() {
  const navigate = useNavigate();
  const { address: walletAddress } = useAccount();
  const { launch, status: launchStatus } = useLaunchOffering();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  // Form states
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [supplyInput, setSupplyInput] = useState("10000");
  const [reservePriceInput, setReservePriceInput] = useState("1.00");
  const [capBpsInput, setCapBpsInput] = useState("1000"); // 10%
  const [minHoldersInput, setMinHoldersInput] = useState("2");
  const [minBondInput, setMinBondInput] = useState("10.0");
  const [attestorsInput, setAttestorsInput] = useState(
    walletAddress || ""
  );
  
  // Date/time offsets or inputs
  const [commitMinutes, setCommitMinutes] = useState("30");
  const [revealMinutes, setRevealMinutes] = useState("30");
  const [challengeMinutes, setChallengeMinutes] = useState("30");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Check DemoUSD balance and allowance for creator if bond > 0
  const { data: allowance } = useReadContract({
    address: DemoUSDAddress,
    abi: DemoUSDAbi,
    functionName: "allowance",
    args: walletAddress && IssuanceFactoryAddress ? [walletAddress, IssuanceFactoryAddress] : undefined,
    query: { enabled: Boolean(walletAddress && IssuanceFactoryAddress) },
  });

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMsg(null);

      if (!walletAddress) {
        setErrorMsg("Please connect your wallet first.");
        return;
      }

      // Validations
      if (!tokenName.trim() || !tokenSymbol.trim()) {
        setErrorMsg("Token name and symbol are required.");
        return;
      }

      const parsedSupply = Number(supplyInput);
      if (isNaN(parsedSupply) || parsedSupply <= 0) {
        setErrorMsg("Supply must be a positive number.");
        return;
      }

      const parsedCapBps = Number(capBpsInput);
      if (isNaN(parsedCapBps) || parsedCapBps < 1 || parsedCapBps > 10000) {
        setErrorMsg("Per-bidder cap must be between 1 and 10000 bps (0.01% - 100%).");
        return;
      }

      const parsedMinHolders = Number(minHoldersInput);
      if (isNaN(parsedMinHolders) || parsedMinHolders <= 0) {
        setErrorMsg("Minimum holders must be at least 1.");
        return;
      }

      const rawAttestors = attestorsInput
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const validAttestors = rawAttestors.filter((a): a is `0x${string}` => isAddress(a));
      if (validAttestors.length === 0) {
        setErrorMsg("At least one valid attestor Ethereum address is required.");
        return;
      }

      const nowSec = Math.floor(Date.now() / 1000);
      const commitSec = Number(commitMinutes) * 60;
      const revealSec = Number(revealMinutes) * 60;
      const challengeSec = Number(challengeMinutes) * 60;

      if (commitSec <= 0 || revealSec <= 0 || challengeSec <= 0) {
        setErrorMsg("All duration windows must be positive values.");
        return;
      }

      const commitWindowEnd = BigInt(nowSec + commitSec);
      const revealWindowEnd = BigInt(nowSec + commitSec + revealSec);
      const challengeWindowLength = BigInt(challengeSec);

      const supplyWei = parseUnits(supplyInput, 18);
      const reservePriceWei = parseUnits(reservePriceInput, 18);
      const minBondWei = parseUnits(minBondInput, 18);

      setSubmitting(true);
      try {
        // Approve factory if minBond > 0 and allowance is insufficient
        if (minBondWei > 0n && allowance !== undefined && allowance < minBondWei && DemoUSDAddress && IssuanceFactoryAddress && publicClient) {
          const appHash = await writeContractAsync({
            address: DemoUSDAddress,
            abi: DemoUSDAbi,
            functionName: "approve",
            args: [IssuanceFactoryAddress, minBondWei * 100n],
          });
          await publicClient.waitForTransactionReceipt({ hash: appHash });
        }

        const result = await launch({
          tokenName,
          tokenSymbol: tokenSymbol.toUpperCase(),
          supply: supplyWei,
          reservePrice: reservePriceWei,
          capBps: parsedCapBps,
          minHolders: parsedMinHolders,
          minBond: minBondWei,
          approvedAttestors: validAttestors,
          commitWindowEnd,
          revealWindowEnd,
          challengeWindowLength,
        });

        navigate(`/app/issuances/${result.issuance}`);
      } catch (err) {
        setErrorMsg(getRevertReason(err));
      } finally {
        setSubmitting(false);
      }
    },
    [
      walletAddress,
      tokenName,
      tokenSymbol,
      supplyInput,
      reservePriceInput,
      capBpsInput,
      minHoldersInput,
      minBondInput,
      attestorsInput,
      commitMinutes,
      revealMinutes,
      challengeMinutes,
      allowance,
      publicClient,
      writeContractAsync,
      launch,
      navigate,
    ]
  );

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-8 p-6">
      <div className="border-b border-white/10 pb-4">
        <h2 className="text-2xl font-bold text-white tracking-tight">Create Sealed-Bid Offering</h2>
        <p className="text-sm text-slate-400 mt-1">
          Deploy a primary security token issuance with sealed-bid commit-reveal auction mechanics.
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
          {errorMsg}
        </div>
      )}

      {/* Section 1: Security Token Details */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white">1. Security Token Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Token Name
            </label>
            <input
              type="text"
              placeholder="e.g. Acme Corp Series A"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Token Symbol
            </label>
            <input
              type="text"
              placeholder="e.g. ACME"
              value={tokenSymbol}
              onChange={(e) => setTokenSymbol(e.target.value)}
              className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-accent uppercase"
              required
            />
          </div>
        </div>
      </div>

      {/* Section 2: Supply & Pricing */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white">2. Supply & Pricing</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Total Supply (tokens)
            </label>
            <input
              type="number"
              value={supplyInput}
              onChange={(e) => setSupplyInput(e.target.value)}
              className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Reserve Price (DUSD / token)
            </label>
            <input
              type="number"
              step="0.01"
              value={reservePriceInput}
              onChange={(e) => setReservePriceInput(e.target.value)}
              className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Per-Bidder Allocation Cap (bps)
            </label>
            <input
              type="number"
              placeholder="1000 = 10%"
              value={capBpsInput}
              onChange={(e) => setCapBpsInput(e.target.value)}
              className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              required
            />
            <span className="text-[11px] text-slate-500">100 bps = 1% cap per address</span>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Minimum Required Bond (DUSD)
            </label>
            <input
              type="number"
              step="0.1"
              value={minBondInput}
              onChange={(e) => setMinBondInput(e.target.value)}
              className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              required
            />
          </div>
        </div>
      </div>

      {/* Section 3: Governance & Attestation */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white">3. Governance & Attestation</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Minimum Distinct Holders Required
            </label>
            <input
              type="number"
              value={minHoldersInput}
              onChange={(e) => setMinHoldersInput(e.target.value)}
              className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Approved Attestor Addresses (one per line or comma-separated)
            </label>
            <textarea
              rows={3}
              value={attestorsInput}
              onChange={(e) => setAttestorsInput(e.target.value)}
              placeholder="0x..."
              className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-accent"
              required
            />
          </div>
        </div>
      </div>

      {/* Section 4: Auction Timeline */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white">4. Auction Timeline</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Commit Window (minutes)
            </label>
            <input
              type="number"
              value={commitMinutes}
              onChange={(e) => setCommitMinutes(e.target.value)}
              className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Reveal Window (minutes)
            </label>
            <input
              type="number"
              value={revealMinutes}
              onChange={(e) => setRevealMinutes(e.target.value)}
              className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Challenge Window (minutes)
            </label>
            <input
              type="number"
              value={challengeMinutes}
              onChange={(e) => setChallengeMinutes(e.target.value)}
              className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              required
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={submitting || launchStatus === "pending"}
          className="px-6 py-3 rounded-lg bg-accent text-black font-semibold text-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {submitting || launchStatus === "pending"
            ? "Deploying Offering..."
            : "Deploy Offering"}
        </button>
      </div>
    </form>
  );
}
