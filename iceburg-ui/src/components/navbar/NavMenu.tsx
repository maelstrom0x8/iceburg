import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

export interface NavMenuLink {
  title: string;
  description: string;
  href: string;
  external?: boolean;
  icon: ReactNode;
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-3.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 4h5.5v5.5M12 4 4 12" />
    </svg>
  );
}

const ITEM_CLASSES =
  "flex items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-app-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

function NavMenuItem({ link }: { link: NavMenuLink }) {
  const body = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
        {link.icon}
      </span>
      <span className="flex-1">
        <span className="flex items-center gap-1 font-semibold text-app-text">
          {link.title}
          {link.external && <ExternalLinkIcon />}
        </span>
        <span className="mt-0.5 block text-sm text-app-muted">{link.description}</span>
      </span>
    </>
  );

  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" role="menuitem" className={ITEM_CLASSES}>
        {body}
      </a>
    );
  }

  return (
    <Link to={link.href} role="menuitem" className={ITEM_CLASSES}>
      {body}
    </Link>
  );
}

export function NavMenu({ label, links }: { label: string; links: NavMenuLink[] }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(location.pathname);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  if (location.pathname !== lastPathname) {
    setLastPathname(location.pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-app-muted transition-colors hover:bg-app-overlay hover:text-app-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {label}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute left-0 top-[calc(100%+0.5rem)] z-10 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-app-border bg-app-surface p-2 shadow-xl shadow-black/10 dark:shadow-black/40"
        >
          {links.map((link) => (
            <NavMenuItem key={link.title} link={link} />
          ))}
        </div>
      )}
    </div>
  );
}
