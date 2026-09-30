import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ResourcesMenu } from "./ResourcesMenu";
import { APP_URL } from "../../config/urls";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

const NAV_LINK_CLASSES =
  `rounded-full px-3 py-2 text-sm font-medium text-app-muted transition-colors hover:bg-app-overlay hover:text-app-text ${FOCUS_RING}`;

const USE_ICEBURG_BASE_CLASSES =
  `rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover ${FOCUS_RING}`;

function IcebergMark() {
  return (
    <svg viewBox="0 0 28 24" className="h-6 w-7" aria-hidden="true">
      <path d="M14 2 8 13h12L14 2Z" className="fill-accent" />
      <path d="M14 9 2 22h24L14 9Z" className="fill-accent-light" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-5" aria-hidden="true">
      <path strokeLinecap="round" d="M3 6h14M3 10h14M3 14h14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-5" aria-hidden="true">
      <path strokeLinecap="round" d="m5 5 10 10M15 5 5 15" />
    </svg>
  );
}

function AboutLink({ className }: { className?: string }) {
  return (
    <NavLink
      to="/about"
      className={({ isActive }) =>
        `${className ?? NAV_LINK_CLASSES} ${isActive ? "text-app-text" : ""}`
      }
    >
      About
    </NavLink>
  );
}

function OfferingsLink({ className }: { className?: string }) {
  return (
    <a href={`${APP_URL}/issuances`} className={className ?? NAV_LINK_CLASSES}>
      Offerings
    </a>
  );
}

function UseIcebergButton({ layoutClassName }: { layoutClassName: string }) {
  return (
    <a href={APP_URL} className={`${layoutClassName} ${USE_ICEBURG_BASE_CLASSES}`}>
      Use Iceburg
    </a>
  );
}

export function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(location.pathname);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 0);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    // Sync on mount in case the page loads mid-scroll.
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (location.pathname !== lastPathname) {
    setLastPathname(location.pathname);
    setMobileOpen(false);
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-colors ${
        scrolled
          ? "border-app-border bg-app-surface/80 backdrop-blur shadow-md shadow-black/10 dark:shadow-black/40"
          : "border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6" aria-label="Primary">
        <div className="flex items-center gap-6">
          <Link to="/" className={`flex items-center gap-2 rounded-md ${FOCUS_RING}`}>
            <IcebergMark />
            <span className="text-lg font-semibold tracking-tight text-app-text">Iceburg</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            <OfferingsLink />
            <ResourcesMenu />
            <AboutLink />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <UseIcebergButton layoutClassName="hidden sm:inline-flex" />

          <button
            type="button"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((value) => !value)}
            className={`inline-flex size-10 items-center justify-center rounded-full text-app-text hover:bg-app-overlay md:hidden ${FOCUS_RING}`}
          >
            {mobileOpen ? <CloseIcon /> : <HamburgerIcon />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div id="mobile-nav" className="border-t border-app-border bg-app-surface px-4 pb-4 md:hidden">
          <div className="flex flex-col items-start gap-1 pt-2">
            <OfferingsLink className={`w-full ${NAV_LINK_CLASSES}`} />
            <ResourcesMenu />
            <AboutLink className={`w-full ${NAV_LINK_CLASSES}`} />
            <UseIcebergButton layoutClassName="mt-2 w-full text-center" />
          </div>
        </div>
      )}
    </header>
  );
}
