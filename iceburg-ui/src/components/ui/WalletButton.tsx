import { ConnectButton } from "@rainbow-me/rainbowkit";

/**
 * Aave-inspired wallet connection button.
 *
 * Disconnected  → bordered pill "Connect Wallet"
 * Wrong network → red-tinted "Wrong network" pill
 * Connected     → chain icon pill + address/avatar pill side-by-side
 */
export function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: { opacity: 0, pointerEvents: "none", userSelect: "none" },
            })}
            className="flex items-center gap-2"
          >
            {!connected ? (
              /* ── Disconnected ─────────────────────────────────────── */
              <button
                onClick={openConnectModal}
                type="button"
                className="flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors"
                style={{
                  borderColor: "var(--color-app-border-2)",
                  color: "var(--color-app-text)",
                  background: "transparent",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "var(--color-app-surface-2)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "transparent";
                }}
              >
                {/* wallet icon */}
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  style={{ opacity: 0.7 }}
                >
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <path d="M16 12h2" />
                </svg>
                Connect Wallet
              </button>
            ) : chain.unsupported ? (
              /* ── Wrong network ────────────────────────────────────── */
              <button
                onClick={openChainModal}
                type="button"
                className="flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors"
                style={{
                  borderColor: "rgba(239,68,68,0.4)",
                  color: "#ef4444",
                  background: "rgba(239,68,68,0.06)",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                Wrong network
              </button>
            ) : (
              /* ── Connected ────────────────────────────────────────── */
              <div className="flex items-center gap-2">
                {/* Chain pill */}
                <button
                  onClick={openChainModal}
                  type="button"
                  className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors"
                  style={{
                    borderColor: "var(--color-app-border-2)",
                    color: "var(--color-app-text)",
                    background: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "var(--color-app-surface-2)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "transparent";
                  }}
                >
                  {chain.hasIcon && chain.iconUrl && (
                    <img
                      alt={chain.name ?? "Chain"}
                      src={chain.iconUrl}
                      width={16}
                      height={16}
                      className="rounded-full"
                      style={{ background: chain.iconBackground }}
                    />
                  )}
                  <span className="hidden sm:inline">{chain.name}</span>
                </button>

                {/* Account pill */}
                <button
                  onClick={openAccountModal}
                  type="button"
                  className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors"
                  style={{
                    borderColor: "var(--color-app-border-2)",
                    color: "var(--color-app-text)",
                    background: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "var(--color-app-surface-2)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "transparent";
                  }}
                >
                  {account.ensAvatar ? (
                    <img
                      src={account.ensAvatar}
                      alt="ENS avatar"
                      width={18}
                      height={18}
                      className="rounded-full"
                    />
                  ) : (
                    /* Jazzicon-style fallback: accent-coloured dot */
                    <span
                      className="inline-block rounded-full shrink-0"
                      style={{
                        width: 18,
                        height: 18,
                        background: "var(--color-accent)",
                      }}
                    />
                  )}
                  <span>{account.displayName}</span>
                </button>
              </div>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
