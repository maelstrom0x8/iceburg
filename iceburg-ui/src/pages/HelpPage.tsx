import { Link } from "react-router-dom";

const QUICK_START = [
  {
    title: "Connect your wallet",
    body: "Use the Connect Wallet button in the app header. If the header shows Wrong network, open it and switch to a supported network.",
  },
  {
    title: "Place a bid",
    body: "Open an offering and commit a quantity and price with your bond. During the reveal window, return to the same offering and reveal the bid.",
  },
  {
    title: "Claim your funds",
    body: "Once an offering has settled or been cancelled, its page shows a Claim button for any refund, proceeds, or bond you are owed.",
  },
];

const COMMON_ISSUES = [
  {
    title: "Reveal says no saved bid was found",
    body: "Your bid details are stored only in the browser and wallet you committed from. Reveal from that same browser and wallet. If the saved details are gone, the bond for that bid is forfeited.",
  },
  {
    title: "A transaction failed",
    body: "Failed transactions show the reason the contract gave. Check that the relevant window is still open and that the offering is in the stage you expect.",
  },
  {
    title: "Claim shows nothing",
    body: "Only finalized offerings have balances to claim, and each wallet claims its own. A zero amount means there is nothing owed to this wallet or it has already been claimed.",
  },
  {
    title: "Wallet asks for a network you don't have",
    body: "Add the network in your wallet, or switch to it from the Wrong network prompt in the app header.",
  },
];

const CARD_STYLE = {
  borderColor: "var(--color-app-border)",
  backgroundColor: "var(--color-app-surface)",
};

export function HelpPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-28">
      <span className="inline-flex rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">Help</span>
      <h1
        className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl"
        style={{ color: "var(--color-app-text)" }}
      >
        Help center
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed" style={{ color: "var(--color-app-muted)" }}>
        Start with the basics below, or check the common issues. Questions about how offerings work are answered in
        the FAQ.
      </p>

      <section className="mt-12">
        <h2 className="text-xl font-semibold" style={{ color: "var(--color-app-text)" }}>
          Getting started
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {QUICK_START.map((item) => (
            <article key={item.title} className="rounded-xl border p-5" style={CARD_STYLE}>
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-app-text)" }}>
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-app-muted)" }}>
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold" style={{ color: "var(--color-app-text)" }}>
          Common issues
        </h2>
        <dl className="mt-5 divide-y" style={{ borderColor: "var(--color-app-border)" }}>
          {COMMON_ISSUES.map((item) => (
            <div key={item.title} className="py-5" style={{ borderColor: "var(--color-app-border)" }}>
              <dt className="text-sm font-medium" style={{ color: "var(--color-app-text)" }}>
                {item.title}
              </dt>
              <dd className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-app-muted)" }}>
                {item.body}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-12 rounded-xl border p-6" style={CARD_STYLE}>
        <h2 className="text-xl font-semibold" style={{ color: "var(--color-app-text)" }}>
          Still need help?
        </h2>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-app-muted)" }}>
          Read the documentation for how each step works, or report a problem on GitHub with the offering address and
          the transaction hash if you have one.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href="https://iohaus.gitbook.io/iceburg"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Read the documentation
          </a>
          <a
            href="https://github.com/maelstrom0x8/iceburg/issues"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-sm font-semibold"
            style={{ borderColor: "var(--color-app-border)", color: "var(--color-app-text)" }}
          >
            Report an issue
          </a>
          <Link
            to="/faq"
            className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold"
            style={{ color: "var(--color-app-text)" }}
          >
            Browse the FAQ
          </Link>
        </div>
      </section>
    </main>
  );
}
