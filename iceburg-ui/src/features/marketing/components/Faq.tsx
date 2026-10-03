const ENTRIES = [
  {
    q: "How is the clearing price decided?",
    a: "It is computed from the confirmed bids against the terms the issuer fixed before bidding opened. The computation is public, so anyone can run it and check the result. Nobody adjusts the price by hand.",
  },
  {
    q: "What if I'm not filled?",
    a: "Any part of your deposit that isn't used for your purchase is returned to you. If you receive nothing, your full deposit comes back. Refunds and proceeds are credited to your balance and released when you press Claim on the offering page.",
  },
  {
    q: "Can the issuer change the terms after bidding starts?",
    a: "No. Supply, the reserve price, the per-bidder cap, the minimum number of holders, and the bond amount are fixed at launch and cannot be changed afterward.",
  },
  {
    q: "What happens if a result looks wrong?",
    a: "During the challenge window, anyone can submit a better result. If it beats the standing result, it replaces it, and the bond posted by the earlier proposal goes to the person who submitted the improvement. Only a result nobody beats within the window settles.",
  },
  {
    q: "Who decides whether I can bid?",
    a: "Iceburg does not decide eligibility. Each offering names approved attestors, and a bid can only be revealed with a valid, unexpired attestation from one of them.",
  },
  {
    q: "What do I need to place a bid?",
    a: "A wallet on a supported network and enough of the offering's payment token to cover your deposit and the required bond. Network gas is paid in the network's native token.",
  },
  {
    q: "What is the bond?",
    a: "A refundable amount posted with each bid. It is returned when you reveal your bid. If you commit and never reveal, the bond is forfeited to the issuer.",
  },
  {
    q: "Can I cancel a bid after committing?",
    a: "Not in the current release. A commitment cannot be withdrawn. To recover your bond, reveal the bid during the reveal window.",
  },
  {
    q: "Which networks are supported?",
    a: "Arbitrum Sepolia and the Robinhood Chain testnet are live today. Arbitrum One and Robinhood Chain mainnet are planned.",
  },
  {
    q: "Has Iceburg been audited?",
    a: "Not yet by an independent third party. Read the known risks in the documentation before committing funds.",
  },
];

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
