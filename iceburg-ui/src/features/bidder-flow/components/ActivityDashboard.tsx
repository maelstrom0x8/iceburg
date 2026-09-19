import { Link } from "react-router-dom";
import { useAccount, useReadContract } from "wagmi";
import { useMyIssuances } from "../hooks/useMyIssuances";
import { useMyBids } from "../hooks/useMyBids";
import { useIssuances, type IssuanceSummary } from "../../issuance-discovery/hooks/useIssuances";
import { StateBadge } from "../../../components/ui/StateBadge";
import { SecurityTokenAbi, IssuanceAbi } from "../../../contracts";

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
    <div className="flex items-center justify-between p-4 rounded-lg" style={{ background: "var(--color-app-surface-2)", border: "1px solid var(--color-app-border)" }}>
      <div>
        <div className="font-semibold" style={{ color: "var(--color-app-text)" }}>{String(name || "Security Token")}</div>
        <div className="text-xs font-mono mt-0.5" style={{ color: "var(--color-app-muted)" }}>{securityTokenAddress}</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold" style={{ color: "var(--color-accent)" }}>
          {(Number(balance) / 1e18).toLocaleString()} {symbol ? String(symbol) : ""}
        </div>
        <div className="text-[11px]" style={{ color: "var(--color-app-muted)" }}>Balance</div>
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
      className="p-4 rounded-xl transition-colors space-y-3 block hover:bg-[var(--color-app-surface-2)]"
      style={{ background: "var(--color-app-surface)", border: "1px solid var(--color-app-border)" }}
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

  if (!walletAddress) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ background: "var(--color-app-surface-2)", border: "1px solid var(--color-app-border)", color: "var(--color-app-muted)" }}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold" style={{ color: "var(--color-app-text)" }}>Wallet Not Connected</h2>
        <p className="text-sm max-w-sm mx-auto" style={{ color: "var(--color-app-muted)" }}>
          Connect your wallet to view your created offerings, active auction bids, and security token balances.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-10">
      <div style={{ borderBottom: "1px solid var(--color-app-border)" }} className="pb-4">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-app-text)" }}>My Activity</h1>
        <p className="text-xs mt-1 font-mono" style={{ color: "var(--color-app-muted)" }}>
          Wallet: {walletAddress}
        </p>
      </div>

      {/* Section 1: My Issuances */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-app-text)" }}>Created Offerings ({myIssuances.length})</h2>
          <Link
            to="/app/issue"
            className="text-xs font-medium hover:underline"
            style={{ color: "var(--color-accent)" }}
          >
            + Create New
          </Link>
        </div>

        {loadingIssuances ? (
          <div className="h-20 rounded-lg animate-pulse" style={{ background: "var(--color-app-surface-2)" }} />
        ) : myIssuances.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm" style={{ borderColor: "var(--color-app-border)", color: "var(--color-app-muted)" }}>
            You haven't launched any offerings yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myIssuances.map((item) => (
              <IssuanceCard key={item.issuanceAddress} summary={item} />
            ))}
          </div>
        )}
      </section>

      {/* Section 2: My Active Bids */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold" style={{ color: "var(--color-app-text)" }}>My Auction Bids ({myBids.length})</h2>

        {loadingBids ? (
          <div className="h-20 rounded-lg animate-pulse" style={{ background: "var(--color-app-surface-2)" }} />
        ) : myBids.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm" style={{ borderColor: "var(--color-app-border)", color: "var(--color-app-muted)" }}>
            No active bid commitments found for this wallet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myBids.map((bid) => (
              <Link
                key={bid.issuanceSummary.issuanceAddress}
                to={`/app/issuances/${bid.issuanceSummary.issuanceAddress}`}
                className="p-4 rounded-xl transition-colors space-y-3 block hover:bg-[var(--color-app-surface-2)]"
                style={{ background: "var(--color-app-surface)", border: "1px solid var(--color-app-border)" }}
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
      </section>

      {/* Section 3: My Token Holdings */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold" style={{ color: "var(--color-app-text)" }}>Security Token Holdings</h2>
        <div className="space-y-3">
          {myBids
            .filter((b) => b.issuanceSummary.securityTokenAddress)
            .map((b) => (
              <HoldingRow
                key={b.issuanceSummary.securityTokenAddress}
                securityTokenAddress={b.issuanceSummary.securityTokenAddress}
              />
            ))}
          {myBids.filter((b) => b.issuanceSummary.securityTokenAddress).length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm" style={{ borderColor: "var(--color-app-border)", color: "var(--color-app-muted)" }}>
              No settled token balances found.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
