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
    <div className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-white/5">
      <div>
        <div className="font-semibold text-white">{String(name || "Security Token")}</div>
        <div className="text-xs font-mono text-slate-400 mt-0.5">{securityTokenAddress}</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold text-accent">
          {(Number(balance) / 1e18).toLocaleString()} {symbol ? String(symbol) : ""}
        </div>
        <div className="text-[11px] text-slate-400">Balance</div>
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
      className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors space-y-3 block"
    >
      <div className="flex items-center justify-between">
        <div className="font-semibold text-white">
          {summary.tokenName || "Offering"}
        </div>
        <StateBadge state={state !== undefined ? Number(state) : undefined} />
      </div>
      <div className="text-xs font-mono text-slate-400 truncate">
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
        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white">Wallet Not Connected</h2>
        <p className="text-sm text-slate-400 max-w-sm mx-auto">
          Connect your wallet to view your created offerings, active auction bids, and security token balances.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-10">
      <div className="border-b border-white/10 pb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">My Activity</h1>
        <p className="text-sm text-slate-400 mt-1 font-mono text-xs">
          Wallet: {walletAddress}
        </p>
      </div>

      {/* Section 1: My Issuances */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Created Offerings ({myIssuances.length})</h2>
          <Link
            to="/app/issue"
            className="text-xs text-accent hover:underline font-medium"
          >
            + Create New
          </Link>
        </div>

        {loadingIssuances ? (
          <div className="h-20 bg-white/5 rounded-lg animate-pulse" />
        ) : myIssuances.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-slate-500 text-sm">
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
        <h2 className="text-lg font-semibold text-white">My Auction Bids ({myBids.length})</h2>

        {loadingBids ? (
          <div className="h-20 bg-white/5 rounded-lg animate-pulse" />
        ) : myBids.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-slate-500 text-sm">
            No active bid commitments found for this wallet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myBids.map((bid) => (
              <Link
                key={bid.issuanceSummary.issuanceAddress}
                to={`/app/issuances/${bid.issuanceSummary.issuanceAddress}`}
                className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors space-y-3 block"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-white">
                    {bid.issuanceSummary.tokenName || "Offering"}
                  </div>
                  <StateBadge state={undefined} />
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Commitment</span>
                  <span className="font-mono text-[11px] text-slate-300">
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
        <h2 className="text-lg font-semibold text-white">Security Token Holdings</h2>
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
            <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-slate-500 text-sm">
              No settled token balances found.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
