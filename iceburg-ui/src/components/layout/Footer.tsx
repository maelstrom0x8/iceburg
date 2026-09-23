import { Link } from "react-router-dom";

function IcebergMark() {
  return (
    <svg viewBox="0 0 28 24" className="h-5 w-[1.625rem] shrink-0" aria-hidden="true">
      <path d="M14 2 8 13h12L14 2Z" className="fill-accent" />
      <path d="M14 9 2 22h24L14 9Z" className="fill-accent-light" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="border-t" style={{ borderColor: "var(--color-app-border)" }}>
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <IcebergMark />
          <span className="text-sm font-semibold" style={{ color: "var(--color-app-text)" }}>
            Iceburg
          </span>
        </Link>
        <nav className="flex items-center gap-5 text-sm" style={{ color: "var(--color-app-muted)" }} aria-label="Footer">
          <Link to="/about" className="hover:text-app-text transition-colors">About</Link>
          <Link to="/faq" className="hover:text-app-text transition-colors">FAQ</Link>
          <Link to="/help" className="hover:text-app-text transition-colors">Help</Link>
        </nav>
        <span className="text-xs" style={{ color: "var(--color-app-muted)" }}>
          © {new Date().getFullYear()} Iceburg
        </span>
      </div>
    </footer>
  );
}
