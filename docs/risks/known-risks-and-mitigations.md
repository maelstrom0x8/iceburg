# Known risks and mitigations

The issuer's own revenue incentive is the protocol's primary named adversary. An issuer left to discretion would sell everything to the single highest bidder, exactly the outcome the concentration cap and diversity floor exist to prevent. Iceburg does not assume the issuer will follow their own stated rules voluntarily; it binds them structurally instead.

## Issuer proposes a self-favoring but feasible clearing

A clearing that technically satisfies all six verification checks can still be one the issuer prefers over what the bid set actually supports, for example a lower-revenue price, or an allocation that leaves value on the table for some other reason.

*Mitigation:* it only stands until the challenge window elapses. Any bidder or outside observer can propose a strictly better clearing during that window and take the beaten proposal's bond. There is no code path that lets the issuer settle a proposal immediately or skip the challenge window.

## Attestor compromise or collusion

A colluding or compromised attestor can sign a valid attestation for an ineligible bidder, and that bidder's reveal will succeed.

*Mitigation:* limited. The protocol's contribution here is making attestation issuance auditable (attestations are on-chain-verified, EIP-712-signed, and expiry-bound) and attestor approval revocable by the issuer going forward. It does not eliminate the need for a trusted attestor, and does not retroactively invalidate a bid already revealed under a since-revoked attestor. See [Eligibility and attestation](../eligibility-and-attestation.md) and [Attestors](../roles/attestors.md).

## Commit-and-ghost griefing

An address can commit a bid, occupying one of the offering's limited (`MAX_BIDS = 64`) slots, and never reveal it.

*Mitigation:* the commit bond is forfeited to the issuer if the address never reveals, enforced automatically at `closeRevealWindow()`.

## The challenge tournament doesn't converge quickly

Nothing forces a profitable improvement to actually be submitted before the challenge window closes. Convergence toward the best price the bid set supports is an economic outcome (a rational actor challenges when the expected reward exceeds gas and bond cost), not a guaranteed one.

*Mitigation:* none at the protocol level beyond the tournament's own termination guarantee (see [The challenge window](../the-offering-lifecycle/the-challenge-window.md)). The last standing proposal when the window closes is always *feasible*, having passed all six verification checks, even if it isn't the best price a more attentive market would have found. Challenge-window length and bond size are launch parameters an issuer can tune to make a profitable challenge worth someone's time, not protocol invariants.

## No third-party security audit

No external, third-party security audit of these contracts has been performed. An internal review has been conducted, which identified and fixed one high-severity frontend issue: a page could treat an arbitrary, unverified contract address as a genuine offering and request a token approval against it. The fix cross-checks any offering address against the protocol's own factory-created set before allowing that request. This internal review is not a substitute for an independent, third-party audit.
