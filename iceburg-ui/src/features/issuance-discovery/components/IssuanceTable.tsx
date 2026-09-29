import { Link } from "react-router-dom";
import { useReadContract } from "wagmi";
import { IssuanceAbi } from "../../../contracts";
import { StateBadge } from "../../../components/ui/StateBadge";
import { CountdownTimer } from "../../../components/ui/CountdownTimer";
import { formatAmount, formatPrice } from "../../../lib/format";
import { usePaymentTokenDecimals } from "../../../hooks/usePaymentTokenDecimals";
import { usePaymentTokenSymbol } from "../../../hooks/usePaymentTokenSymbol";
import { getRevertReason } from "../../../lib/revertReasons";
import { useIssuances, type IssuanceSummary } from "../hooks/useIssuances";

const TH = "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider";
const TD = "px-4 py-4 text-sm";

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-3.5 animate-pulse rounded ${className}`}
      style={{ background: "var(--color-app-surface-2)" }}
    />
  );
}

function IssuanceRow({
  issuanceAddress,
  tokenName,
  tokenSymbol,
}: {
  issuanceAddress: `0x${string}`;
  tokenName: string;
  tokenSymbol: string;
}) {
  const { data: state } = useReadContract({
    address: issuanceAddress,
    abi: IssuanceAbi,
    functionName: "state",
    query: { refetchInterval: 12_000 },
  });

  const { data: rawParams } = useReadContract({
    address: issuanceAddress,
    abi: IssuanceAbi,
    functionName: "params",
    query: { refetchInterval: 60_000 },
  });

  const { data: bidCount } = useReadContract({
    address: issuanceAddress,
    abi: IssuanceAbi,
    functionName: "bidCount",
    query: { refetchInterval: 12_000 },
  });

  const params = rawParams as
    | readonly [bigint, bigint, number, number, bigint, `0x${string}`, `0x${string}`, bigint, bigint, bigint]
    | undefined;

  // Each row is a different Issuance, potentially with a different payment
  // token (the protocol accepts an arbitrary one per offering) — resolve
  // decimals/symbol from this row's own params, not chain-wide config.
  const paymentTokenAddress = params ? params[5] : undefined;
  const { decimals } = usePaymentTokenDecimals(paymentTokenAddress);
  const { symbol } = usePaymentTokenSymbol(paymentTokenAddress);

  const stateNum = state !== undefined ? Number(state) : undefined;
  const reservePrice = params ? params[1] : undefined;
  const supply = params ? params[0] : undefined;
  const commitWindowEnd = params ? params[7] : undefined;

  return (
    <tr
      className="group relative transition-colors cursor-pointer hover:bg-[var(--color-app-surface-2)]"
      style={{ borderTop: "1px solid var(--color-app-border)" }}
    >
      <td className={TD}>
        <Link
          to={`/issuances/${issuanceAddress}`}
          className="absolute inset-0 z-10"
          aria-label={`View ${tokenName} offering`}
        />
        <div className="font-medium" style={{ color: "var(--color-app-text)" }}>{tokenName || "—"}</div>
        <div className="text-xs mt-0.5 font-mono" style={{ color: "var(--color-app-muted)" }}>
          {tokenSymbol}
        </div>
      </td>
      <td className={TD}>
        <StateBadge state={stateNum} />
      </td>
      <td className={`${TD} tabular-nums font-medium`}>
        {reservePrice !== undefined && decimals !== undefined ? (
          <span style={{ color: "var(--color-app-text)" }}>
            {formatPrice(reservePrice, decimals)} {symbol}
          </span>
        ) : (
          <Skeleton className="w-20" />
        )}
      </td>
      <td className={`${TD} tabular-nums`}>
        {supply !== undefined ? (
          <span style={{ color: "var(--color-app-text)" }}>{formatAmount(supply)}</span>
        ) : (
          <Skeleton className="w-16" />
        )}
      </td>
      <td className={TD}>
        {commitWindowEnd !== undefined ? (
          <CountdownTimer deadline={commitWindowEnd} />
        ) : (
          <Skeleton className="w-24" />
        )}
      </td>
      <td className={`${TD} tabular-nums`}>
        {bidCount !== undefined ? (
          <span style={{ color: "var(--color-app-text)" }}>{bidCount.toString()}</span>
        ) : (
          <Skeleton className="w-8" />
        )}
      </td>
    </tr>
  );
}

export function IssuanceTable() {
  const { issuances, isLoading, error } = useIssuances();

  const tableStyle = {
    background: "var(--color-app-surface)",
    border: "1px solid var(--color-app-border)",
  };

  if (isLoading) {
    return (
      <div className="rounded-xl p-10 text-center" style={tableStyle}>
        <div className="flex flex-col gap-3 items-center">
          <Skeleton className="w-40 h-4" />
          <Skeleton className="w-32 h-3" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-xl p-6 text-sm"
        style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
      >
        Failed to load offerings: {getRevertReason(error)}
      </div>
    );
  }

  if (issuances.length === 0) {
    return (
      <div className="rounded-xl p-16 text-center space-y-4" style={tableStyle}>
        <p className="text-lg font-medium" style={{ color: "var(--color-app-text)" }}>No offerings yet</p>
        <p className="text-sm" style={{ color: "var(--color-app-muted)" }}>
          No sealed-bid auctions have been deployed on this network.
        </p>
        <Link
          to="/issue"
          className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
          style={{ background: "var(--color-accent)" }}
        >
          Create First Offering
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl" style={tableStyle}>
      <table className="w-full text-left">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--color-app-border)" }}>
            <th className={TH} style={{ color: "var(--color-app-muted)" }}>Token</th>
            <th className={TH} style={{ color: "var(--color-app-muted)" }}>State</th>
            <th className={TH} style={{ color: "var(--color-app-muted)" }}>Reserve Price</th>
            <th className={TH} style={{ color: "var(--color-app-muted)" }}>Supply</th>
            <th className={TH} style={{ color: "var(--color-app-muted)" }}>Commit Window</th>
            <th className={TH} style={{ color: "var(--color-app-muted)" }}>Bids</th>
          </tr>
        </thead>
        <tbody>
          {issuances.map((item: IssuanceSummary) => (
            <IssuanceRow
              key={item.issuanceAddress}
              issuanceAddress={item.issuanceAddress}
              tokenName={item.tokenName}
              tokenSymbol={item.tokenSymbol}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
