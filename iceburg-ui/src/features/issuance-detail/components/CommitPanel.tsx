import { useState, useCallback } from "react";
import { useAccount, useWriteContract, usePublicClient, useReadContract } from "wagmi";
import { keccak256, encodeAbiParameters, parseAbiParameters, parseUnits, type Abi, type Address } from "viem";
import { IssuanceAbi, DemoUSDAbi } from "../../../contracts";
import { useIssuanceContext } from "../context/IssuanceContext";
import { usePaymentTokenDecimals } from "../../../hooks/usePaymentTokenDecimals";
import { usePaymentTokenSymbol } from "../../../hooks/usePaymentTokenSymbol";
import { useSponsoredKernelClient } from "../../../hooks/useSponsoredKernelClient";
import { formatPrice } from "../../../lib/format";
import { getRevertReason } from "../../../lib/revertReasons";
import { waitForSuccessfulReceipt } from "../../../lib/waitForSuccessfulReceipt";

// ── Local storage key for stored bids ────────────────────────────────────────

const BID_KEY = (issuanceAddr: string, walletAddr: string) =>
  `iceburg:bid:${issuanceAddr.toLowerCase()}:${walletAddr.toLowerCase()}`;

interface StoredBid {
  qty: string;
  price: string;
  salt: string;
  timestamp: number;
}

function storeBid(issuanceAddress: string, walletAddress: string, bid: StoredBid): void {
  try {
    localStorage.setItem(BID_KEY(issuanceAddress, walletAddress), JSON.stringify(bid));
  } catch {
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

export function computeCommitment(qty: bigint, price: bigint, salt: `0x${string}`, bidder: Address): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters("uint256 qty, uint256 price, bytes32 salt, address bidder"),
      [qty, price, salt, bidder],
    ),
  );
}

// ── Shared style constants ────────────────────────────────────────────────────

const INPUT =
  "w-full rounded-lg border px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-accent";
const INPUT_STYLE = {
  background: "var(--color-app-bg)",
  borderColor: "var(--color-app-border-2)",
  color: "var(--color-app-text)",
};

const LABEL_STYLE = {
  color: "var(--color-app-muted)",
  fontSize: "0.75rem",
  fontWeight: 500,
  marginBottom: "0.375rem",
  display: "block",
};

type Phase = "idle" | "approving" | "committing" | "done" | "error";

export function CommitPanel() {
  const { address: issuanceAddress, params, commitment } = useIssuanceContext();
  const { address: walletAddress, isConnected } = useAccount();
  const paymentTokenAddress = params?.paymentToken;
  const { decimals } = usePaymentTokenDecimals(paymentTokenAddress);
  const { symbol } = usePaymentTokenSymbol(paymentTokenAddress);
  const publicClient = usePublicClient();

  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [sponsoredGas, setSponsoredGas] = useState(false);

  const { writeContractAsync } = useWriteContract();
  const { getSponsoredClient, isAvailable: sponsorshipAvailable } = useSponsoredKernelClient();

  const write = useCallback(
    async (params: { address: Address; abi: Abi; functionName: string; args: readonly unknown[] }) => {
      if (sponsoredGas) {
        const sponsoredClient = await getSponsoredClient();
        return sponsoredClient.writeContract({ ...params, chain: undefined });
      }
      if (!publicClient) return writeContractAsync(params);

      const { maxFeePerGas, maxPriorityFeePerGas } = await publicClient.estimateFeesPerGas();
      return writeContractAsync({
        ...params,
        maxFeePerGas: (maxFeePerGas * 125n) / 100n,
        maxPriorityFeePerGas: (maxPriorityFeePerGas * 125n) / 100n,
      });
    },
    [sponsoredGas, getSponsoredClient, writeContractAsync, publicClient],
  );

  const { data: currentAllowance } = useReadContract({
    address: paymentTokenAddress,
    abi: DemoUSDAbi,
    functionName: "allowance",
    args: walletAddress ? [walletAddress, issuanceAddress] : undefined,
    query: { enabled: !!walletAddress && !!paymentTokenAddress, refetchInterval: 15_000 },
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

        if (allowance < totalNeeded) {
          if (!paymentTokenAddress) throw new Error("Payment token address not configured.");
          setPhase("approving");
          const approveParams = {
            address: paymentTokenAddress,
            abi: DemoUSDAbi as Abi,
            functionName: "approve",
            args: [issuanceAddress, totalNeeded],
          };
          const approveHash = await write(approveParams);
          await waitForSuccessfulReceipt(publicClient, approveHash, approveParams, walletAddress);
        }

        const salt = generateSalt();
        const commitment = computeCommitment(qtyBig, priceBig, salt, walletAddress);

        storeBid(issuanceAddress, walletAddress, {
          qty: qtyBig.toString(),
          price: priceBig.toString(),
          salt,
          timestamp: Date.now(),
        });

        setPhase("committing");
        const commitParams = {
          address: issuanceAddress,
          abi: IssuanceAbi as Abi,
          functionName: "commitBid",
          args: [commitment, bond],
        };
        const hash = await write(commitParams);
        await waitForSuccessfulReceipt(publicClient, hash, commitParams, walletAddress);

        setTxHash(hash);
        setPhase("done");
      } catch (err) {
        setErrorMsg(getRevertReason(err));
        setPhase("error");
      }
    },
    [
      walletAddress, publicClient, params, decimals, qty, price,
      currentAllowance, issuanceAddress, write, paymentTokenAddress,
    ],
  );

  if (!isConnected) {
    return (
      <p className="text-sm text-center" style={{ color: "var(--color-app-muted)" }}>
        Connect your wallet to place a bid.
      </p>
    );
  }

  if (hasCommitted) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm text-emerald-500">
        <p className="font-semibold">Bid committed ✓</p>
        <p className="mt-1 opacity-70">Return during the reveal window to reveal your bid.</p>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm">
        <p className="font-semibold text-emerald-500">Commitment submitted ✓</p>
        {txHash && (
          <p className="mt-1 break-all text-xs" style={{ color: "var(--color-app-muted)" }}>{txHash}</p>
        )}
        <p className="mt-2 text-xs" style={{ color: "var(--color-app-muted)" }}>
          Your bid details are saved in your browser. Return during the reveal window to complete.
        </p>
      </div>
    );
  }

  const canSubmit = phase === "idle" || phase === "error";
  const pending = phase === "approving" || phase === "committing";

  const qtyBig = (() => { try { return qty ? BigInt(qty) : 0n; } catch { return 0n; } })();
  const priceBig = (() => {
    try { return price && decimals !== undefined ? parseUnits(price, decimals) : 0n; } catch { return 0n; }
  })();
  const estimatedEscrow = qtyBig * priceBig;
  const bondRequired = params?.minBond ?? 0n;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {phase === "approving" && (
        <TxBanner message={`Approving ${symbol ?? "payment token"} spend… confirm in your wallet.`} />
      )}
      {phase === "committing" && (
        <TxBanner message="Submitting commitment… confirm in your wallet." />
      )}
      {errorMsg && (
        <ErrorBanner message={errorMsg} onDismiss={() => { setErrorMsg(null); setPhase("idle"); }} />
      )}

      <div>
        <label htmlFor="commit-qty" style={LABEL_STYLE}>Quantity (tokens)</label>
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
          style={INPUT_STYLE}
        />
      </div>

      <div>
        <label htmlFor="commit-price" style={LABEL_STYLE}>Price per token{symbol ? ` (${symbol})` : ""}</label>
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
          style={INPUT_STYLE}
        />
        {params && decimals !== undefined && (
          <p className="mt-1 text-xs" style={{ color: "var(--color-app-muted)" }}>
            Reserve price: {formatPrice(params.reservePrice, decimals)} {symbol}
          </p>
        )}
      </div>

      {(estimatedEscrow > 0n || bondRequired > 0n) && decimals !== undefined && (
        <div
          className="rounded-lg p-3 text-sm space-y-1.5"
          style={{
            background: "var(--color-app-surface-2)",
            border: "1px solid var(--color-app-border)",
          }}
        >
          <div className="flex justify-between">
            <span style={{ color: "var(--color-app-muted)" }}>Escrow</span>
            <span style={{ color: "var(--color-app-text)" }} className="font-medium">
              {formatPrice(estimatedEscrow, decimals)} {symbol}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--color-app-muted)" }}>Bond</span>
            <span style={{ color: "var(--color-app-text)" }} className="font-medium">
              {formatPrice(bondRequired, decimals)} {symbol}
            </span>
          </div>
          <div
            className="flex justify-between pt-1.5 font-semibold"
            style={{ borderTop: "1px solid var(--color-app-border)" }}
          >
            <span style={{ color: "var(--color-app-muted)" }}>Total</span>
            <span className="text-accent">
              {formatPrice(estimatedEscrow + bondRequired, decimals)} {symbol}
            </span>
          </div>
        </div>
      )}

      {sponsorshipAvailable && (
        <label className="flex items-center gap-2 text-xs" style={{ color: "var(--color-app-muted)" }}>
          <input
            type="checkbox"
            checked={sponsoredGas}
            onChange={(e) => setSponsoredGas(e.target.checked)}
            disabled={!canSubmit || pending}
          />
          Use gas-sponsored transactions (experimental)
        </label>
      )}

      <button
        type="submit"
        disabled={!canSubmit || pending || !qty || !price}
        className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-accent/80 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "Processing…" : "Commit Bid"}
      </button>
      <p className="text-center text-xs" style={{ color: "var(--color-app-muted)" }}>
        Your bid is sealed. Only the commitment hash is sent on-chain.
      </p>
    </form>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function TxBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-500">
      <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
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
    <div className="flex items-start justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
      <span>{message}</span>
      <button onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100">✕</button>
    </div>
  );
}
