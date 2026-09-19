import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

interface ResourceLink {
  title: string;
  description: string;
  href: string;
  external?: boolean;
  icon: ReactNode;
}

function DocumentationIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 2.5h5.5L15 6v10.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.5 2.5V6H15M7.25 10h5.5M7.25 13h5.5" />
    </svg>
  );
}

function FaqIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-5" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.8 7.8a2.2 2.2 0 1 1 3.3 1.9c-.7.45-1.1.8-1.1 1.6v.3" />
      <path strokeLinecap="round" d="M10 14.2h.01" />
    </svg>
  );
}

function SupportIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 10.5v-1a6 6 0 1 1 12 0v1" />
      <rect x="2.5" y="10" width="3.5" height="4.5" rx="1" />
      <rect x="14" y="10" width="3.5" height="4.5" rx="1" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 14.5v.8a2 2 0 0 1-2 2h-2.2" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-3.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 4h5.5v5.5M12 4 4 12" />
    </svg>
  );
}



const RESOURCE_LINKS: ResourceLink[] = [
  {
    title: "Documentation",
    description: "Guides & API reference",
    href: "https://docs.iceburg.com",
    external: true,
    icon: <DocumentationIcon />,
  },
  {
    title: "FAQs",
    description: "Answers to common questions",
    href: "/faq",
    icon: <FaqIcon />,
  },
  {
    title: "Help and Support",
    description: "Guides, articles & more",
    href: "/help",
    icon: <SupportIcon />,
  },
];

const ITEM_CLASSES =
  "flex items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:hover:bg-white/10";

function ResourceItem({ link }: { link: ResourceLink }) {
  const body = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
        {link.icon}
      </span>
      <span className="flex-1">
        <span className="flex items-center gap-1 font-semibold text-black dark:text-white">
          {link.title}
          {link.external && (
            <ExternalLinkIcon />
          )}
        </span>
        <span className="mt-0.5 block text-sm text-black/60 dark:text-white/60">{link.description}</span>
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

export function ResourcesMenu() {
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

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-black/70 transition-colors hover:bg-black/5 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
      >
        Resources
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute left-0 top-[calc(100%+0.5rem)] z-10 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-black/10 bg-white p-2 shadow-xl shadow-black/10 dark:border-white/10 dark:bg-neutral-950"
        >
          {RESOURCE_LINKS.map((link) => (
            <ResourceItem key={link.title} link={link} />
          ))}
        </div>
      )}
    </div>
  );
}
