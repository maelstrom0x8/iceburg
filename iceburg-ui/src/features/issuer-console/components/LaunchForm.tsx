import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { parseUnits, isAddress } from "viem";
import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { useLaunchOffering } from "../../../hooks/useLaunchOffering";
import { DemoUSDAbi, IssuanceFactoryAddressByChain, useContractAddress } from "../../../contracts";
import { usePaymentTokenAddress } from "../../../config/paymentToken";
import { usePaymentTokenDecimals } from "../../../hooks/usePaymentTokenDecimals";
import { usePaymentTokenSymbol } from "../../../hooks/usePaymentTokenSymbol";
import { getRevertReason } from "../../../lib/revertReasons";

export function LaunchForm() {
  const navigate = useNavigate();
  const { address: walletAddress } = useAccount();
  const { launch, status: launchStatus } = useLaunchOffering();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const paymentTokenAddress = usePaymentTokenAddress();
  const issuanceFactoryAddress = useContractAddress(IssuanceFactoryAddressByChain);
  const { decimals } = usePaymentTokenDecimals();
  const { symbol: paymentSymbol } = usePaymentTokenSymbol();

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
    address: paymentTokenAddress,
    abi: DemoUSDAbi,
    functionName: "allowance",
    args: walletAddress && issuanceFactoryAddress ? [walletAddress, issuanceFactoryAddress] : undefined,
    query: { enabled: Boolean(walletAddress && issuanceFactoryAddress) },
  });

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMsg(null);

      if (!walletAddress) {
        setErrorMsg("Please connect your wallet first.");
        return;
      }

      if (!tokenName.trim() || !tokenSymbol.trim()) {
        setErrorMsg("Token name and symbol are required.");
        return;
      }

      if (decimals === undefined) {
        setErrorMsg("Payment token details are still loading — try again in a moment.");
        return;
      }

      const parsedSupply = Number(supplyInput);
      if (isNaN(parsedSupply) || parsedSupply <= 0 || !Number.isInteger(parsedSupply)) {
        setErrorMsg("Supply must be a positive whole number.");
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

      // SecurityToken.decimals() is overridden to 0 — supply is a whole-unit
      // share count, never scaled. Reserve price and bond are in the payment
      // token's own decimals (system_architecture.md §4.1).
      const supplyWei = BigInt(supplyInput);
      const reservePriceWei = parseUnits(reservePriceInput, decimals);
      const minBondWei = parseUnits(minBondInput, decimals);

      setSubmitting(true);
      try {
        if (minBondWei > 0n && allowance !== undefined && allowance < minBondWei && paymentTokenAddress && issuanceFactoryAddress && publicClient) {
          const appHash = await writeContractAsync({
            address: paymentTokenAddress,
            abi: DemoUSDAbi,
            functionName: "approve",
            args: [issuanceFactoryAddress, minBondWei * 100n],
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
      paymentTokenAddress,
      issuanceFactoryAddress,
      decimals,
      launch,
      navigate,
    ]
  );

  const surfaceStyle = {
    background: "var(--color-app-surface)",
    border: "1px solid var(--color-app-border)",
  };

  const inputStyle = {
    background: "var(--color-app-surface-2)",
    border: "1px solid var(--color-app-border)",
    color: "var(--color-app-text)",
  };

  const labelStyle = {
    color: "var(--color-app-muted)",
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-8 p-6">
      <div style={{ borderBottom: "1px solid var(--color-app-border)" }} className="pb-4">
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-app-text)" }}>Create Sealed-Bid Offering</h2>
        <p className="text-sm mt-1" style={{ color: "var(--color-app-muted)" }}>
          Deploy a primary security token issuance with sealed-bid commit-reveal auction mechanics.
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-lg p-4 text-sm" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
          {errorMsg}
        </div>
      )}

      {/* Section 1: Security Token Details */}
      <div className="rounded-xl p-6 space-y-4" style={surfaceStyle}>
        <h3 className="text-lg font-semibold" style={{ color: "var(--color-app-text)" }}>1. Security Token Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={labelStyle}>
              Token Name
            </label>
            <input
              type="text"
              placeholder="e.g. Acme Corp Series A"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              style={inputStyle}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={labelStyle}>
              Token Symbol
            </label>
            <input
              type="text"
              placeholder="e.g. ACME"
              value={tokenSymbol}
              onChange={(e) => setTokenSymbol(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-accent"
              style={inputStyle}
              required
            />
          </div>
        </div>
      </div>

      {/* Section 2: Supply & Pricing */}
      <div className="rounded-xl p-6 space-y-4" style={surfaceStyle}>
        <h3 className="text-lg font-semibold" style={{ color: "var(--color-app-text)" }}>2. Supply & Pricing</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={labelStyle}>
              Total Supply (tokens)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={supplyInput}
              onChange={(e) => setSupplyInput(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              style={inputStyle}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={labelStyle}>
              Reserve Price{paymentSymbol ? ` (${paymentSymbol} / token)` : ""}
            </label>
            <input
              type="number"
              step="0.01"
              value={reservePriceInput}
              onChange={(e) => setReservePriceInput(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              style={inputStyle}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={labelStyle}>
              Per-Bidder Allocation Cap (bps)
            </label>
            <input
              type="number"
              placeholder="1000 = 10%"
              value={capBpsInput}
              onChange={(e) => setCapBpsInput(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              style={inputStyle}
              required
            />
            <span className="text-[11px] block mt-0.5" style={{ color: "var(--color-app-muted)" }}>100 bps = 1% cap per address</span>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={labelStyle}>
              Minimum Required Bond{paymentSymbol ? ` (${paymentSymbol})` : ""}
            </label>
            <input
              type="number"
              step="0.1"
              value={minBondInput}
              onChange={(e) => setMinBondInput(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              style={inputStyle}
              required
            />
          </div>
        </div>
      </div>

      {/* Section 3: Governance & Attestation */}
      <div className="rounded-xl p-6 space-y-4" style={surfaceStyle}>
        <h3 className="text-lg font-semibold" style={{ color: "var(--color-app-text)" }}>3. Governance & Attestation</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={labelStyle}>
              Minimum Distinct Holders Required
            </label>
            <input
              type="number"
              value={minHoldersInput}
              onChange={(e) => setMinHoldersInput(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              style={inputStyle}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={labelStyle}>
              Approved Attestor Addresses (one per line or comma-separated)
            </label>
            <textarea
              rows={3}
              value={attestorsInput}
              onChange={(e) => setAttestorsInput(e.target.value)}
              placeholder="0x..."
              className="w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-accent"
              style={inputStyle}
              required
            />
          </div>
        </div>
      </div>

      {/* Section 4: Auction Timeline */}
      <div className="rounded-xl p-6 space-y-4" style={surfaceStyle}>
        <h3 className="text-lg font-semibold" style={{ color: "var(--color-app-text)" }}>4. Auction Timeline</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={labelStyle}>
              Commit Window (minutes)
            </label>
            <input
              type="number"
              value={commitMinutes}
              onChange={(e) => setCommitMinutes(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              style={inputStyle}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={labelStyle}>
              Reveal Window (minutes)
            </label>
            <input
              type="number"
              value={revealMinutes}
              onChange={(e) => setRevealMinutes(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              style={inputStyle}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={labelStyle}>
              Challenge Window (minutes)
            </label>
            <input
              type="number"
              value={challengeMinutes}
              onChange={(e) => setChallengeMinutes(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              style={inputStyle}
              required
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={submitting || launchStatus === "pending"}
          className="px-6 py-3 rounded-lg text-black font-semibold text-sm transition-colors disabled:opacity-50"
          style={{ background: "var(--color-accent)" }}
        >
          {submitting || launchStatus === "pending"
            ? "Deploying Offering..."
            : "Deploy Offering"}
        </button>
      </div>
    </form>
  );
}
