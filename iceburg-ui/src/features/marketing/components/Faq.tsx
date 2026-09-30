const ENTRIES = [
  {
    q: "How is the price computed?",
    a: "From the confirmed bids, against the terms the issuer fixed before bidding opened. Anyone can run the same computation and check the outcome — it isn't a person's judgment call. In the example offering, demand alone crosses supply at $7.00, but that would leave too few distinct holders — the floor pulls the price down to admit one more, landing at $6.50.",
  },
  {
    q: "What if I'm not filled?",
    a: "Your full deposit is refunded automatically. Nothing is held back, and there's no manual step where someone has to decide to return it.",
  },
  {
    q: "Can the issuer change the terms after bidding starts?",
    a: "No. Floor price, the concentration cap, and the holder minimum are fixed at launch and can't be loosened afterward, no matter what the bids look like.",
  },
  {
    q: "What happens if an outcome looks wrong?",
    a: "During the challenge window, anyone can submit a better outcome and earn the deposit posted by the original proposal. Only an outcome nobody manages to beat within that window settles.",
  },
  {
    q: "Who decides if I'm allowed to bid?",
    a: "Iceburg computes the price and allocations. It doesn't decide eligibility — that's a check handled by an approved compliance partner before a bid can be confirmed.",
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
