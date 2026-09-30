import { Link } from "react-router-dom";

function IcebergMark() {
  return (
    <svg viewBox="0 0 28 24" className="h-5 w-[1.625rem] shrink-0" aria-hidden="true">
      <path d="M14 2 8 13h12L14 2Z" className="fill-accent" />
      <path d="M14 9 2 22h24L14 9Z" className="fill-accent-light" />
    </svg>
  );
}

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "https://iohaus.gitbook.io/iceburg", external: true },
      { label: "FAQ", href: "/faq" },
      { label: "Help & Support", href: "/help" },
    ],
  },
  {
    title: "Company",
    links: [{ label: "About", href: "/about" }],
  },
];

function FooterLinkItem({ link }: { link: FooterLink }) {
  const className = "text-sm transition-colors hover:text-app-text";
  const style = { color: "var(--color-app-muted)" };

  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className={className} style={style}>
        {link.label}
      </a>
    );
  }

  return (
    <Link to={link.href} className={className} style={style}>
      {link.label}
    </Link>
  );
}

export function Footer() {
  return (
    <footer className="border-t" style={{ borderColor: "var(--color-app-border)", background: "var(--color-app-surface)" }}>
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p
          className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ color: "var(--color-app-text)" }}
        >
          Fixed terms. Bids set the price. Verify it yourself.
        </p>

        <div className="mt-14 grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <IcebergMark />
              <span className="text-sm font-semibold" style={{ color: "var(--color-app-text)" }}>
                Iceburg
              </span>
            </Link>
          </div>
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <div
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-app-muted)" }}
              >
                {column.title}
              </div>
              <ul className="mt-3 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <FooterLinkItem link={link} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="mt-14 flex flex-col gap-2 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: "var(--color-app-border)", color: "var(--color-app-muted)" }}
        >
          <span>© {new Date().getFullYear()} Iceburg</span>
          <span>Live on Arbitrum Sepolia and Robinhood Chain testnet</span>
        </div>
      </div>
    </footer>
  );
}
