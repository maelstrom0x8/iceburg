import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ResourcesMenu } from "./ResourcesMenu";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

const NAV_LINK_CLASSES =
  `rounded-full px-3 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${FOCUS_RING}`;

const USE_ICEBURG_BASE_CLASSES =
  `rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80 ${FOCUS_RING}`;

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
        `${className ?? NAV_LINK_CLASSES} ${
          isActive
            ? "text-black/70 dark:text-white"
            : "text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white"
        }`
      }
    >
      About
    </NavLink>
  );
}

function UseIcebergButton({ layoutClassName }: { layoutClassName: string }) {
  return (
    <Link to="/app" className={`${layoutClassName} ${USE_ICEBURG_BASE_CLASSES}`}>
      Use Iceburg
    </Link>
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
    <header className={`sticky top-0 z-50 border-b border-black/10 bg-white/80 backdrop-blur transition-shadow dark:border-white/10 dark:bg-black/80${scrolled ? " shadow-md shadow-black/10 dark:shadow-black/40" : ""}`}>
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6" aria-label="Primary">
        <Link to="/" className={`flex items-center gap-2 rounded-md ${FOCUS_RING}`}>
          <IcebergMark />
          <span className="text-lg font-semibold tracking-tight text-black dark:text-white">Iceburg</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          <ResourcesMenu />
          <AboutLink />
        </div>

        <div className="flex items-center gap-2">
          <UseIcebergButton layoutClassName="hidden sm:inline-flex" />

          <button
            type="button"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((value) => !value)}
            className={`inline-flex size-10 items-center justify-center rounded-full text-black hover:bg-black/5 md:hidden dark:text-white dark:hover:bg-white/10 ${FOCUS_RING}`}
          >
            {mobileOpen ? <CloseIcon /> : <HamburgerIcon />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div id="mobile-nav" className="border-t border-black/10 px-4 pb-4 md:hidden dark:border-white/10">
          <div className="flex flex-col items-start gap-1 pt-2">
            <ResourcesMenu />
            <AboutLink className={`w-full ${NAV_LINK_CLASSES}`} />
            <UseIcebergButton layoutClassName="mt-2 w-full text-center" />
          </div>
        </div>
      )}
    </header>
  );
}
