import { Link } from "react-router-dom";
import { useReadContract } from "wagmi";
import { IssuanceAbi } from "../../../contracts";
import { StateBadge } from "../../../components/ui/StateBadge";
import { CountdownTimer } from "../../../components/ui/CountdownTimer";
import { formatDUSD, formatUnits } from "../../../lib/format";
import { useIssuances, type IssuanceSummary } from "../hooks/useIssuances";

// ── Shared helpers ────────────────────────────────────────────────────────────

const CELL = "px-4 py-3.5 text-sm";
const MUTED = "text-[var(--color-app-muted)]";

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 animate-pulse rounded bg-white/10 ${className}`}
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

  const stateNum = state !== undefined ? Number(state) : undefined;
  const reservePrice = params ? params[1] : undefined;
  const supply = params ? params[0] : undefined;
  const commitWindowEnd = params ? params[7] : undefined;

  return (
    <tr className="group cursor-pointer border-t border-[var(--color-app-border)] transition-colors hover:bg-app-surface-2 relative">
      <td className={CELL}>
        <Link
          to={`/app/issuances/${issuanceAddress}`}
          className="absolute inset-0 z-10"
          aria-label={`View ${tokenName} issuance`}
        />
        <div className="font-semibold text-white">{tokenName}</div>
        <div className={`text-xs ${MUTED}`}>{tokenSymbol}</div>
      </td>
      <td className={CELL}>
        <StateBadge state={stateNum} />
      </td>
      <td className={`${CELL} tabular-nums`}>
        {reservePrice !== undefined ? (
          <span className="text-white font-medium">
            {formatDUSD(reservePrice)}
          </span>
        ) : (
          <Skeleton className="w-20" />
        )}
      </td>
      <td className={`${CELL} tabular-nums`}>
        {supply !== undefined ? (
          formatUnits(supply, 18)
        ) : (
          <Skeleton className="w-16" />
        )}
      </td>
      <td className={CELL}>
        {commitWindowEnd !== undefined ? (
          <CountdownTimer deadline={commitWindowEnd} />
        ) : (
          <Skeleton className="w-24" />
        )}
      </td>
      <td className={`${CELL} tabular-nums`}>
        {bidCount !== undefined ? (
          <span className="text-white">{bidCount.toString()}</span>
        ) : (
          <Skeleton className="w-8" />
        )}
      </td>
    </tr>
  );
}

export function IssuanceTable() {
  const { issuances, isLoading, error } = useIssuances();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[var(--color-app-border)] bg-[var(--color-app-surface)] p-8 text-center">
        <Skeleton className="w-48 mx-auto" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/[0.02] p-6 text-sm text-red-400">
        Failed to load offerings list: {error.message}
      </div>
    );
  }

  if (issuances.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 p-12 text-center text-slate-400 space-y-3">
        <h3 className="text-lg font-semibold text-white">No active offerings found</h3>
        <p className="text-sm text-slate-400 max-w-sm mx-auto">
          No primary sealed-bid auctions have been deployed on this network yet.
        </p>
        <div className="pt-2">
          <Link
            to="/app/issue"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-black font-semibold text-sm hover:bg-accent-hover transition-colors"
          >
            Create First Offering
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-app-border)] bg-[var(--color-app-surface)]">
      <table className="w-full text-left">
        <thead className="bg-white/5 text-xs font-semibold text-[var(--color-app-muted)] uppercase tracking-wider">
          <tr>
            <th className={CELL}>Token</th>
            <th className={CELL}>State</th>
            <th className={CELL}>Reserve Price</th>
            <th className={CELL}>Supply</th>
            <th className={CELL}>Commit Deadline</th>
            <th className={CELL}>Bids</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
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
