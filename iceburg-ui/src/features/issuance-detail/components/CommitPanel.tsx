import { useState, useCallback } from "react";
import { useAccount, useWriteContract, usePublicClient, useReadContract } from "wagmi";
import { keccak256, encodeAbiParameters, parseAbiParameters, parseUnits } from "viem";
import { IssuanceAbi, DemoUSDAbi, DemoUSDAddress } from "../../../contracts";
import { useIssuanceContext } from "../context/IssuanceContext";
import { usePaymentTokenDecimals } from "../../../hooks/usePaymentTokenDecimals";
import { formatPrice } from "../../../lib/format";
import { getRevertReason } from "../../../lib/revertReasons";

// ── Local storage key for stored bids ────────────────────────────────────────

const BID_KEY = (addr: string) =>
  `iceburg:bid:${addr.toLowerCase()}`;

interface StoredBid {
  qty: string;
  price: string;
  salt: string;
  timestamp: number;
}

function storeBid(issuanceAddress: string, bid: StoredBid): void {
  try {
    localStorage.setItem(BID_KEY(issuanceAddress), JSON.stringify(bid));
  } catch {
    // Storage full — not a fatal error for the tx itself
    console.warn("Could not persist bid to localStorage.");
  }
}

function generateSalt(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return (
    "0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")
  ) as `0x${string}`;
}

function computeCommitment(qty: bigint, price: bigint, salt: `0x${string}`): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters("uint256 qty, uint256 price, bytes32 salt"),
      [qty, price, salt],
    ),
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

const MUTED = "text-[var(--color-app-muted)]";
const INPUT =
  "w-full rounded-lg border border-[var(--color-app-border)] bg-[var(--color-app-bg)] px-3 py-2.5 text-sm text-[var(--color-app-text)] placeholder:text-[var(--color-app-muted)] focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";
const LABEL = `mb-1.5 block text-xs font-medium ${MUTED}`;

type Phase = "idle" | "approving" | "committing" | "done" | "error";

export function CommitPanel() {
  const { address: issuanceAddress, params, commitment } = useIssuanceContext();
  const { address: walletAddress, isConnected } = useAccount();
  const { decimals } = usePaymentTokenDecimals();
  const publicClient = usePublicClient();

  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();

  // Read current DemoUSD allowance for this issuance
  const { data: currentAllowance } = useReadContract({
    address: DemoUSDAddress,
    abi: DemoUSDAbi,
    functionName: "allowance",
    args: walletAddress ? [walletAddress, issuanceAddress] : undefined,
    query: { enabled: !!walletAddress && !!DemoUSDAddress, refetchInterval: 15_000 },
  });

  const hasCommitted =
    commitment !== undefined &&
    commitment !== "0x0000000000000000000000000000000000000000000000000000000000000000";

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!walletAddress || !publicClient || !params || decimals === undefined) return;

      setPhase("idle");
      setErrorMsg(null);
      setTxHash(null);

      try {
        const qtyBig = BigInt(qty.trim());
        const priceBig = parseUnits(price.trim(), decimals);
        const bond = params.minBond;
        const escrow = qtyBig * priceBig;
        const totalNeeded = escrow + bond;

        const allowance = (currentAllowance as bigint | undefined) ?? 0n;

        // Step 1: Approve if necessary
        if (allowance < totalNeeded) {
          if (!DemoUSDAddress) throw new Error("Payment token address not configured.");
          setPhase("approving");
          const approveHash = await writeContractAsync({
            address: DemoUSDAddress,
            abi: DemoUSDAbi,
            functionName: "approve",
            args: [issuanceAddress, totalNeeded],
          });
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }

        // Step 2: Generate salt, compute commitment, persist locally
        const salt = generateSalt();
        const commitment = computeCommitment(qtyBig, priceBig, salt);

        storeBid(issuanceAddress, {
          qty: qtyBig.toString(),
          price: priceBig.toString(),
          salt,
          timestamp: Date.now(),
        });

        // Step 3: Commit
        setPhase("committing");
        const hash = await writeContractAsync({
          address: issuanceAddress,
          abi: IssuanceAbi,
          functionName: "commitBid",
          args: [commitment, bond],
        });
        await publicClient.waitForTransactionReceipt({ hash });

        setTxHash(hash);
        setPhase("done");
      } catch (err) {
        setErrorMsg(getRevertReason(err));
        setPhase("error");
      }
    },
    [
      walletAddress,
      publicClient,
      params,
      decimals,
      qty,
      price,
      currentAllowance,
      issuanceAddress,
      writeContractAsync,
    ],
  );

  if (!isConnected) {
    return (
      <WalletPrompt message="Connect your wallet to place a bid." />
    );
  }

  if (hasCommitted) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm text-emerald-400">
        <p className="font-semibold">Bid committed ✓</p>
        <p className="mt-1 text-emerald-400/70">
          Return during the reveal window to reveal your bid.
        </p>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm">
        <p className="font-semibold text-emerald-400">Commitment submitted ✓</p>
        {txHash && (
          <p className={`mt-1 break-all text-xs ${MUTED}`}>{txHash}</p>
        )}
        <p className={`mt-2 text-xs ${MUTED}`}>
          Your bid details (qty, price, salt) are saved in your browser. Return
          during the reveal window to complete your bid.
        </p>
      </div>
    );
  }

  const canSubmit =
    phase === "idle" || phase === "error";
  const pending = phase === "approving" || phase === "committing";

  const qtyBig = (() => {
    try { return qty ? BigInt(qty) : 0n; } catch { return 0n; }
  })();
  const priceBig = (() => {
    try { return price && decimals !== undefined ? parseUnits(price, decimals) : 0n; } catch { return 0n; }
  })();
  const estimatedEscrow = qtyBig * priceBig;
  const bondRequired = params?.minBond ?? 0n;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {phase === "approving" && (
        <TxBanner message="Approving DemoUSD spend… confirm in your wallet." />
      )}
      {phase === "committing" && (
        <TxBanner message="Submitting commitment… confirm in your wallet." />
      )}
      {errorMsg && (
        <ErrorBanner message={errorMsg} onDismiss={() => { setErrorMsg(null); setPhase("idle"); }} />
      )}

      <div>
        <label htmlFor="commit-qty" className={LABEL}>
          Quantity (tokens)
        </label>
        <input
          id="commit-qty"
          type="number"
          min="1"
          step="1"
          required
          placeholder="e.g. 1000"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className={INPUT}
        />
      </div>

      <div>
        <label htmlFor="commit-price" className={LABEL}>
          Price per token (DUSD)
        </label>
        <input
          id="commit-price"
          type="number"
          min="0"
          step="any"
          required
          placeholder="e.g. 1.50"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className={INPUT}
        />
        {params && decimals !== undefined && (
          <p className={`mt-1 text-xs ${MUTED}`}>
            Reserve price:{" "}
            {formatPrice(params.reservePrice, decimals)} DUSD
          </p>
        )}
      </div>

      {/* Cost summary */}
      {(estimatedEscrow > 0n || bondRequired > 0n) && decimals !== undefined && (
        <div className="rounded-lg border border-[var(--color-app-border)] bg-[var(--color-app-bg)] p-3 text-sm">
          <div className="flex justify-between">
            <span className={MUTED}>Escrow</span>
            <span className="text-[var(--color-app-text)] font-medium">
              {formatPrice(estimatedEscrow, decimals)} DUSD
            </span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className={MUTED}>Bond</span>
            <span className="text-[var(--color-app-text)] font-medium">
              {formatPrice(bondRequired, decimals)} DUSD
            </span>
          </div>
          <div className="mt-2 flex justify-between border-t border-[var(--color-app-border)] pt-2 font-semibold">
            <span className={MUTED}>Total</span>
            <span className="text-accent">
              {formatPrice(estimatedEscrow + bondRequired, decimals)} DUSD
            </span>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit || pending || !qty || !price}
        className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-accent/80 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "Processing…" : "Commit Bid"}
      </button>
      <p className={`text-center text-xs ${MUTED}`}>
        Your bid is sealed. Only the commitment hash is sent on-chain.
      </p>
    </form>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function WalletPrompt({ message }: { message: string }) {
  return (
    <p className={`text-sm ${MUTED} text-center`}>{message}</p>
  );
}

function TxBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-400">
      <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
      {message}
    </div>
  );
}

function ErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
      <span>{message}</span>
      <button onClick={onDismiss} className="shrink-0 text-red-400/60 hover:text-red-400">
        ✕
      </button>
    </div>
  );
}
