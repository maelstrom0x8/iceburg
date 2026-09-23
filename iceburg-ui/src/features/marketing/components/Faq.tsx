const ENTRIES = [
  {
    q: "How is the price computed?",
    a: "From the revealed bids, against the terms the issuer fixed before bidding opened. Anyone can run the same published computation and check the result — it isn't a person's judgment call.",
  },
  {
    q: "What if I'm not filled?",
    a: "Your full escrow is refunded automatically. Nothing is held back, and there's no manual step where someone has to decide to return it.",
  },
  {
    q: "Can the issuer change the rules after bidding starts?",
    a: "No. Reserve price, the per-bidder cap, and the minimum-holder requirement are fixed at creation and can't be loosened afterward, no matter what the bids turn out to look like.",
  },
  {
    q: "What happens if a result looks wrong?",
    a: "During a review window, anyone can submit a better result and get paid the stake the original, worse proposal had to post. Only a result nobody manages to beat within that window settles.",
  },
  {
    q: "Who decides if I'm allowed to bid?",
    a: "Iceburg decides price and allocation. It doesn't decide who's eligible to bid — that's a separate check the issuer requires before a bid can be revealed.",
  },
];

/**
 * Collapsed-by-default accordion, native <details>/<summary> — free
 * keyboard and screen-reader semantics, no custom ARIA state to get
 * wrong. This is where remaining depth lives, per the Aave reference:
 * everything that would otherwise be visible running prose moves here.
 */
export function Faq() {
  return (
    <div className="divide-y" style={{ borderColor: "var(--color-app-border)" }}>
      {ENTRIES.map((entry) => (
        <details key={entry.q} className="group py-4" style={{ borderColor: "var(--color-app-border)" }}>
          <summary
            className="flex cursor-pointer items-center justify-between gap-4 text-sm font-medium marker:content-none [&::-webkit-details-marker]:hidden"
            style={{ color: "var(--color-app-text)" }}
          >
            {entry.q}
            <span
              className="shrink-0 text-lg leading-none transition-transform group-open:rotate-45"
              style={{ color: "var(--color-app-muted)" }}
              aria-hidden="true"
            >
              +
            </span>
          </summary>
          <p className="mt-2.5 text-sm leading-relaxed" style={{ color: "var(--color-app-muted)" }}>
            {entry.a}
          </p>
        </details>
      ))}
    </div>
  );
}
