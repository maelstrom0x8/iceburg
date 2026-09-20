import { Link } from "react-router-dom";
import { useAccount, useReadContract } from "wagmi";
import { useMyIssuances } from "../hooks/useMyIssuances";
import { useMyBids } from "../hooks/useMyBids";
import { useIssuances, type IssuanceSummary } from "../../issuance-discovery/hooks/useIssuances";
import { StateBadge } from "../../../components/ui/StateBadge";
import { SecurityTokenAbi, IssuanceAbi } from "../../../contracts";
import { YourInfoCard } from "../../../components/ui/YourInfoCard";

function HoldingRow({ securityTokenAddress }: { securityTokenAddress: `0x${string}` }) {
  const { address: walletAddress } = useAccount();

  const { data: symbol } = useReadContract({
    address: securityTokenAddress,
    abi: SecurityTokenAbi,
    functionName: "symbol",
  });

  const { data: name } = useReadContract({
    address: securityTokenAddress,
    abi: SecurityTokenAbi,
    functionName: "name",
  });

  const { data: balance } = useReadContract({
    address: securityTokenAddress,
    abi: SecurityTokenAbi,
    functionName: "balanceOf",
    args: walletAddress ? [walletAddress] : undefined,
    query: { enabled: Boolean(walletAddress) },
  });

  if (!balance || balance === 0n) return null;

  return (
    <div
      className="flex items-center justify-between p-4 rounded-xl transition-colors"
      style={{
        background: "var(--color-app-surface)",
        border: "1px solid var(--color-app-border)",
      }}
    >
      <div>
        <div className="font-semibold" style={{ color: "var(--color-app-text)" }}>
          {String(name || "Security Token")}
        </div>
        <div className="text-xs font-mono mt-0.5" style={{ color: "var(--color-app-muted)" }}>
          {securityTokenAddress}
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold" style={{ color: "var(--color-accent)" }}>
          {(Number(balance) / 1e18).toLocaleString()} {symbol ? String(symbol) : ""}
        </div>
        <div className="text-[11px]" style={{ color: "var(--color-app-muted)" }}>
          Balance
        </div>
      </div>
    </div>
  );
}

function IssuanceCard({ summary }: { summary: IssuanceSummary }) {
  const { data: state } = useReadContract({
    address: summary.issuanceAddress,
    abi: IssuanceAbi,
    functionName: "state",
  });

  return (
    <Link
      to={`/app/issuances/${summary.issuanceAddress}`}
      className="p-4 rounded-xl transition-all space-y-3 block hover:border-[var(--color-accent)] shadow-xs"
      style={{
        background: "var(--color-app-surface)",
        border: "1px solid var(--color-app-border)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="font-semibold" style={{ color: "var(--color-app-text)" }}>
          {summary.tokenName || "Offering"}
        </div>
        <StateBadge state={state !== undefined ? Number(state) : undefined} />
      </div>
      <div className="text-xs font-mono truncate" style={{ color: "var(--color-app-muted)" }}>
        {summary.issuanceAddress}
      </div>
    </Link>
  );
}

export function ActivityDashboard() {
  const { address: walletAddress } = useAccount();
  const { issuances: allIssuances } = useIssuances();
  const { issuances: myIssuances, isLoading: loadingIssuances } = useMyIssuances(walletAddress);
  const { bids: myBids, isLoading: loadingBids } = useMyBids(allIssuances, walletAddress);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Left Column (Main content cards) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Card 1: Created Offerings */}
        <div
          className="rounded-2xl border p-6 space-y-5"
          style={{
            background: "var(--color-app-surface)",
            borderColor: "var(--color-app-border)",
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.03)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold" style={{ color: "var(--color-app-text)" }}>
                Created Offerings
              </h2>
              <span
                className="px-2 py-0.5 text-xs font-medium rounded-full"
                style={{
                  background: "var(--color-app-surface-2)",
                  color: "var(--color-app-muted)",
                  border: "1px solid var(--color-app-border)",
                }}
              >
                {myIssuances.length}
              </span>
            </div>
            <Link
              to="/app/issue"
              className="text-xs font-semibold hover:underline flex items-center gap-1"
              style={{ color: "var(--color-accent)" }}
            >
              + Create New
            </Link>
          </div>

          <div
            className="rounded-xl border p-5"
            style={{
              background: "var(--color-app-surface-2)",
              borderColor: "var(--color-app-border)",
            }}
          >
            {loadingIssuances ? (
              <div className="h-20 rounded-lg animate-pulse" style={{ background: "var(--color-app-surface)" }} />
            ) : myIssuances.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center mx-auto"
                  style={{
                    background: "var(--color-app-surface)",
                    border: "1px solid var(--color-app-border)",
                    color: "var(--color-app-muted)",
                  }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xs" style={{ color: "var(--color-app-muted)" }}>
                  You haven't launched any offerings yet.
                </p>
                <Link
                  to="/app/issue"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border"
                  style={{
                    borderColor: "var(--color-app-border-2)",
                    color: "var(--color-app-text)",
                    background: "var(--color-app-surface)",
                  }}
                >
                  + Launch Offering
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myIssuances.map((item) => (
                  <IssuanceCard key={item.issuanceAddress} summary={item} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Card 2: My Auction Bids */}
        <div
          className="rounded-2xl border p-6 space-y-5"
          style={{
            background: "var(--color-app-surface)",
            borderColor: "var(--color-app-border)",
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.03)",
          }}
        >
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold" style={{ color: "var(--color-app-text)" }}>
              My Auction Bids
            </h2>
            <span
              className="px-2 py-0.5 text-xs font-medium rounded-full"
              style={{
                background: "var(--color-app-surface-2)",
                color: "var(--color-app-muted)",
                border: "1px solid var(--color-app-border)",
              }}
            >
              {myBids.length}
            </span>
          </div>

          <div
            className="rounded-xl border p-5"
            style={{
              background: "var(--color-app-surface-2)",
              borderColor: "var(--color-app-border)",
            }}
          >
            {loadingBids ? (
              <div className="h-20 rounded-lg animate-pulse" style={{ background: "var(--color-app-surface)" }} />
            ) : myBids.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-xs" style={{ color: "var(--color-app-muted)" }}>
                  No active bid commitments found for this wallet.
                </p>
                <Link
                  to="/app/issuances"
                  className="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                  style={{ color: "var(--color-accent)" }}
                >
                  Browse Active Offerings &rarr;
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myBids.map((bid) => (
                  <Link
                    key={bid.issuanceSummary.issuanceAddress}
                    to={`/app/issuances/${bid.issuanceSummary.issuanceAddress}`}
                    className="p-4 rounded-xl transition-all space-y-3 block hover:border-[var(--color-accent)] shadow-xs"
                    style={{
                      background: "var(--color-app-surface)",
                      border: "1px solid var(--color-app-border)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold" style={{ color: "var(--color-app-text)" }}>
                        {bid.issuanceSummary.tokenName || "Offering"}
                      </div>
                      <StateBadge state={undefined} />
                    </div>
                    <div className="flex justify-between text-xs" style={{ color: "var(--color-app-muted)" }}>
                      <span>Commitment</span>
                      <span className="font-mono text-[11px]" style={{ color: "var(--color-app-text)" }}>
                        {bid.commitment.slice(0, 10)}...{bid.commitment.slice(-8)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Security Token Holdings */}
        <div
          className="rounded-2xl border p-6 space-y-5"
          style={{
            background: "var(--color-app-surface)",
            borderColor: "var(--color-app-border)",
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.03)",
          }}
        >
          <h2 className="text-base font-bold" style={{ color: "var(--color-app-text)" }}>
            Security Token Holdings
          </h2>

          <div
            className="rounded-xl border p-5"
            style={{
              background: "var(--color-app-surface-2)",
              borderColor: "var(--color-app-border)",
            }}
          >
            {myBids.filter((b) => b.issuanceSummary.securityTokenAddress).length === 0 ? (
              <div className="py-8 text-center text-xs" style={{ color: "var(--color-app-muted)" }}>
                No settled token balances found.
              </div>
            ) : (
              <div className="space-y-3">
                {myBids
                  .filter((b) => b.issuanceSummary.securityTokenAddress)
                  .map((b) => (
                    <HoldingRow
                      key={b.issuanceSummary.securityTokenAddress}
                      securityTokenAddress={b.issuanceSummary.securityTokenAddress}
                    />
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column (Your Info Side Card) */}
      <div className="lg:col-span-1">
        <YourInfoCard />
      </div>
    </div>
  );
}
