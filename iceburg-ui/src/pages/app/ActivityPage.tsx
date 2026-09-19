import { useAccount } from "wagmi";
import { AppSubHeader } from "../../components/layout/AppSubHeader";
import { ActivityDashboard } from "../../features/bidder-flow/components/ActivityDashboard";
import { useMyIssuances } from "../../features/bidder-flow/hooks/useMyIssuances";
import { useIssuances } from "../../features/issuance-discovery/hooks/useIssuances";
import { useMyBids } from "../../features/bidder-flow/hooks/useMyBids";

function ActivityIcon() {
  return (
    <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

export function ActivityPage() {
  const { address: walletAddress } = useAccount();
  const { issuances: allIssuances } = useIssuances();
  const { issuances: myIssuances } = useMyIssuances(walletAddress);
  const { bids: myBids } = useMyBids(allIssuances, walletAddress);

  return (
    <div>
      <AppSubHeader
        icon={<ActivityIcon />}
        title="My Activity"
        description="Your created offerings, active bids, and security token holdings."
        stats={[
          {
            label: "My Offerings",
            value: walletAddress ? myIssuances.length.toString() : "—",
          },
          {
            label: "Active Bids",
            value: walletAddress ? myBids.length.toString() : "—",
          },
        ]}
      />
      <div className="mx-auto max-w-screen-xl px-6 py-8">
        <ActivityDashboard />
      </div>
    </div>
  );
}
