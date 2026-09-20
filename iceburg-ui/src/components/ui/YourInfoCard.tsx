import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMyIssuances } from "../../features/bidder-flow/hooks/useMyIssuances";
import { useMyBids } from "../../features/bidder-flow/hooks/useMyBids";
import { useIssuances } from "../../features/issuance-discovery/hooks/useIssuances";

export function YourInfoCard() {
  const { address: walletAddress, isConnected } = useAccount();
  const { issuances: allIssuances } = useIssuances();
  const { issuances: myIssuances } = useMyIssuances(walletAddress);
  const { bids: myBids } = useMyBids(allIssuances, walletAddress);
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="rounded-2xl border p-6 space-y-5"
      style={{
        background: "var(--color-app-surface)",
        borderColor: "var(--color-app-border)",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.03)",
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold" style={{ color: "var(--color-app-text)" }}>
          Your info
        </h3>
        {isConnected && (
          <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--color-app-muted)" }}>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Connected
          </span>
        )}
      </div>

      {!isConnected ? (
        <div className="space-y-4">
          <p className="text-xs leading-relaxed" style={{ color: "var(--color-app-muted)" }}>
            Please connect a wallet to view your personal information, created offerings, and active auction commitments here.
          </p>
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button
                onClick={openConnectModal}
                type="button"
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold border transition-colors shadow-xs flex items-center justify-center gap-2"
                style={{
                  borderColor: "var(--color-app-border-2)",
                  color: "var(--color-app-text)",
                  background: "var(--color-app-surface-2)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--color-app-overlay-hover)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--color-app-surface-2)";
                }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <path d="M16 12h2" />
                </svg>
                Connect Wallet
              </button>
            )}
          </ConnectButton.Custom>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Wallet address badge box */}
          <div
            className="p-3.5 rounded-xl border space-y-2"
            style={{
              background: "var(--color-app-surface-2)",
              borderColor: "var(--color-app-border)",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium" style={{ color: "var(--color-app-muted)" }}>
                Wallet Address
              </span>
              <button
                onClick={copyAddress}
                type="button"
                className="text-[11px] font-medium hover:underline flex items-center gap-1"
                style={{ color: "var(--color-accent)" }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="font-mono text-xs truncate font-semibold" style={{ color: "var(--color-app-text)" }}>
              {walletAddress}
            </div>
          </div>

          {/* Key Activity Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="p-3 rounded-xl border text-center"
              style={{
                background: "var(--color-app-surface-2)",
                borderColor: "var(--color-app-border)",
              }}
            >
              <div className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--color-app-muted)" }}>
                Offerings
              </div>
              <div className="text-xl font-bold mt-0.5" style={{ color: "var(--color-app-text)" }}>
                {myIssuances.length}
              </div>
            </div>

            <div
              className="p-3 rounded-xl border text-center"
              style={{
                background: "var(--color-app-surface-2)",
                borderColor: "var(--color-app-border)",
              }}
            >
              <div className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--color-app-muted)" }}>
                Active Bids
              </div>
              <div className="text-xl font-bold mt-0.5" style={{ color: "var(--color-app-text)" }}>
                {myBids.length}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="pt-2 space-y-2">
            <Link
              to="/app/issue"
              className="w-full py-2 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border"
              style={{
                borderColor: "var(--color-app-border-2)",
                color: "var(--color-app-text)",
                background: "transparent",
              }}
            >
              + Create New Offering
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
