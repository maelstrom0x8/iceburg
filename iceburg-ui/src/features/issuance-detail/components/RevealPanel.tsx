import { useState, useCallback } from "react";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { isHex } from "viem";
import { IssuanceAbi } from "../../../contracts";
import { useIssuanceContext } from "../context/IssuanceContext";
import { getRevertReason } from "../../../lib/revertReasons";

// ── Local storage helpers ─────────────────────────────────────────────────────

const BID_KEY = (addr: string) => `iceburg:bid:${addr.toLowerCase()}`;

interface StoredBid {
  qty: string;
  price: string;
  salt: string;
  timestamp: number;
}

function loadStoredBid(issuanceAddress: string): StoredBid | null {
  try {
    const raw = localStorage.getItem(BID_KEY(issuanceAddress));
    if (!raw) return null;
    return JSON.parse(raw) as StoredBid;
  } catch {
    return null;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

const MUTED = "text-[var(--color-app-muted)]";
const INPUT =
  "w-full rounded-lg border border-[var(--color-app-border)] bg-[var(--color-app-bg)] px-3 py-2.5 text-sm text-white placeholder:text-[var(--color-app-muted)] focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";
const LABEL = `mb-1.5 block text-xs font-medium ${MUTED}`;

type Phase = "idle" | "revealing" | "done" | "error";

export function RevealPanel() {
  const { address: issuanceAddress, commitment } = useIssuanceContext();
  const { address: walletAddress, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const stored = loadStoredBid(issuanceAddress);

  const [qty, setQty] = useState(stored?.qty ?? "");
  const [price, setPrice] = useState(stored?.price ?? "");
  const [salt, setSalt] = useState(stored?.salt ?? "");
  const [attestationExpiry, setAttestationExpiry] = useState("");
  const [attestationSignature, setAttestationSignature] = useState("");

  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const hasCommitment =
    commitment &&
    commitment !== "0x0000000000000000000000000000000000000000000000000000000000000000";

  const handleReveal = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!walletAddress || !publicClient) return;

      setPhase("idle");
      setErrorMsg(null);
      setTxHash(null);

      try {
        if (!isHex(salt) || salt.length !== 66) {
          throw new Error("Salt must be a 32-byte hex string (0x followed by 64 hex chars).");
        }
        if (!attestationSignature || !isHex(attestationSignature)) {
          throw new Error("Attestation signature must be a hex string.");
        }
        const expiry = BigInt(attestationExpiry);

        setPhase("revealing");
        const hash = await writeContractAsync({
          address: issuanceAddress,
          abi: IssuanceAbi,
          functionName: "revealBid",
          args: [
            BigInt(qty),
            BigInt(price),
            salt as `0x${string}`,
            expiry,
            attestationSignature as `0x${string}`,
          ],
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
      qty,
      price,
      salt,
      attestationExpiry,
      attestationSignature,
      issuanceAddress,
      writeContractAsync,
    ],
  );

  if (!isConnected) {
    return <p className={`text-sm text-center ${MUTED}`}>Connect your wallet to reveal your bid.</p>;
  }

  if (!hasCommitment) {
    return (
      <p className={`text-sm text-center ${MUTED}`}>
        You have no committed bid for this offering. Nothing to reveal.
      </p>
    );
  }

  if (phase === "done") {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm">
        <p className="font-semibold text-emerald-400">Bid revealed ✓</p>
        {txHash && (
          <p className={`mt-1 break-all text-xs ${MUTED}`}>{txHash}</p>
        )}
        <p className={`mt-2 text-xs ${MUTED}`}>
          Your bid is now in the order book. Wait for the reveal window to close
          and a clearing proposal to be submitted.
        </p>
      </div>
    );
  }

  const pending = phase === "revealing";

  return (
    <form onSubmit={handleReveal} className="space-y-4">
      {!stored && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          No saved bid found in this browser. Enter your original bid details manually.
        </div>
      )}

      {phase === "revealing" && (
        <TxBanner message="Revealing bid… confirm in your wallet." />
      )}
      {errorMsg && (
        <ErrorBanner message={errorMsg} onDismiss={() => { setErrorMsg(null); setPhase("idle"); }} />
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="reveal-qty" className={LABEL}>
            Quantity (tokens)
          </label>
          <input
            id="reveal-qty"
            type="number"
            min="1"
            step="1"
            required
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label htmlFor="reveal-price" className={LABEL}>
            Price (raw units)
          </label>
          <input
            id="reveal-price"
            type="number"
            min="0"
            step="1"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={INPUT}
          />
        </div>
      </div>

      <div>
        <label htmlFor="reveal-salt" className={LABEL}>
          Salt (bytes32 hex)
        </label>
        <input
          id="reveal-salt"
          type="text"
          required
          placeholder="0x..."
          value={salt}
          onChange={(e) => setSalt(e.target.value)}
          className={`${INPUT} font-mono text-xs`}
        />
      </div>

      <div className="rounded-lg border border-[var(--color-app-border)] p-4 space-y-3">
        <p className={`text-xs font-semibold uppercase tracking-wider ${MUTED}`}>
          Compliance Attestation
        </p>
        <div>
          <label htmlFor="reveal-expiry" className={LABEL}>
            Attestation expiry (unix timestamp)
          </label>
          <input
            id="reveal-expiry"
            type="number"
            min="0"
            required
            placeholder="e.g. 1799999999"
            value={attestationExpiry}
            onChange={(e) => setAttestationExpiry(e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label htmlFor="reveal-sig" className={LABEL}>
            Attestation signature (hex)
          </label>
          <input
            id="reveal-sig"
            type="text"
            required
            placeholder="0x..."
            value={attestationSignature}
            onChange={(e) => setAttestationSignature(e.target.value)}
            className={`${INPUT} font-mono text-xs`}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-accent/80 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "Revealing…" : "Reveal Bid"}
      </button>
    </form>
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

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
      <span>{message}</span>
      <button onClick={onDismiss} className="shrink-0 text-red-400/60 hover:text-red-400">✕</button>
    </div>
  );
}
