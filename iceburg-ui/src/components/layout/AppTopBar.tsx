import { NavLink, Link } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";

interface Tab {
  to: string;
  label: string;
}

const TABS: Tab[] = [
  { to: "/app/issuances", label: "Offerings" },
  { to: "/app/activity", label: "My Activity" },
  { to: "/app/issue", label: "Issue" },
  { to: "/app/clearing", label: "Clearing" },
];

function IcebergMark() {
  return (
    <svg viewBox="0 0 28 24" className="h-5 w-[1.625rem] shrink-0" aria-hidden="true">
      <path d="M14 2 8 13h12L14 2Z" className="fill-accent" />
      <path d="M14 9 2 22h24L14 9Z" className="fill-accent-light" />
    </svg>
  );
}

export function AppTopBar() {
  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        background: "var(--color-app-surface)",
        borderColor: "var(--color-app-border)",
      }}
    >
      <div className="mx-auto flex h-14 max-w-screen-xl items-center gap-8 px-6">
        {/* Wordmark */}
        <Link
          to="/"
          className="flex items-center gap-2 shrink-0"
        >
          <IcebergMark />
          <span className="text-sm font-semibold tracking-tight" style={{ color: "var(--color-app-text)" }}>
            Iceburg
          </span>
        </Link>

        {/* Tab nav */}
        <nav className="flex flex-1 items-stretch h-14 gap-1" aria-label="App navigation">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                [
                  "relative flex items-center px-3 text-sm transition-colors font-medium",
                  isActive
                    ? "font-semibold"
                    : "hover:opacity-80",
                ].join(" ")
              }
              style={({ isActive }) => ({
                color: isActive ? "var(--color-app-text)" : "var(--color-app-muted)",
              })}
            >
              {({ isActive }) => (
                <>
                  {tab.label}
                  {isActive && (
                    <span
                      className="absolute inset-x-0 bottom-0 h-0.5 bg-accent"
                      aria-hidden="true"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Right-side actions */}
        <div className="shrink-0 flex items-center gap-3">
          <ConnectButton
            accountStatus="avatar"
            chainStatus="icon"
            showBalance={false}
          />
        </div>
      </div>
    </header>
  );
}
