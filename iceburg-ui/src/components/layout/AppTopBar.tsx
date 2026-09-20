import { NavLink, Link } from "react-router-dom";
import { WalletButton } from "../ui/WalletButton";
import { AppSettingsMenu } from "./AppSettingsMenu";

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
      <div className="mx-auto flex h-[52px] max-w-screen-xl items-center gap-6 px-6">
        {/* Wordmark */}
        <Link
          to="/"
          className="flex items-center gap-2 shrink-0"
        >
          <IcebergMark />
          <span
            className="text-sm font-bold tracking-tight"
            style={{ color: "var(--color-app-text)" }}
          >
            Iceburg
          </span>
        </Link>

        {/* Tab nav — fills remaining space, left-aligned */}
        <nav className="flex flex-1 items-stretch h-[52px] gap-0.5" aria-label="App navigation">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                [
                  "relative flex items-center px-3.5 text-sm font-medium transition-colors whitespace-nowrap",
                  isActive ? "" : "hover:opacity-90",
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
                      className="absolute inset-x-0 bottom-0 h-[2px] rounded-t-full"
                      style={{ background: "var(--color-accent)" }}
                      aria-hidden="true"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Right-side wallet actions & settings */}
        <div className="shrink-0 flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
            style={{
              borderColor: "var(--color-app-border-2)",
              color: "var(--color-app-muted)",
              background: "var(--color-app-surface-2)",
            }}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Foundry
          </div>
          <WalletButton />
          <AppSettingsMenu />
        </div>
      </div>
    </header>
  );
}
