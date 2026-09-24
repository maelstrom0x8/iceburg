import { NavLink } from "react-router-dom";
import { WalletButton } from "../ui/WalletButton";
import { MARKETING_URL } from "../../config/urls";

interface Tab {
  to: string;
  label: string;
}

const TABS: Tab[] = [
  { to: "/issuances", label: "Offerings" },
  { to: "/activity", label: "My Activity" },
  { to: "/issue", label: "Issue" },
  { to: "/clearing", label: "Clearing" },
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
        {/* Wordmark — links back to the marketing site, a different origin now */}
        <a
          href={MARKETING_URL}
          className="flex items-center gap-2 shrink-0"
        >
          <IcebergMark />
          <span
            className="text-sm font-bold tracking-tight"
            style={{ color: "var(--color-app-text)" }}
          >
            Iceburg
          </span>
        </a>

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

        {/* Right-side wallet actions */}
        <div className="shrink-0 flex items-center">
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
