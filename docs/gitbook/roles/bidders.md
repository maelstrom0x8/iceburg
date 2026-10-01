# Bidders

Any address that holds a valid attestation from one of an offering's approved attestors can bid. There is no cap on the number of distinct bidders, only on the total number of commits accepted per offering (`MAX_BIDS = 64`).

### The path from commit to settlement

A bidder commits a sealed bid (quantity, price, and a bond) during the commit window, then reveals it (the same quantity and price, plus the attestation) during the reveal window, escrowing `quantity × price` in the payment token at that point. See Commit and reveal and Eligibility and attestation for the exact mechanics.

Once the reveal window closes, the bidder's fate depends on the clearing that ultimately settles: a bid priced at or above the final clearing price receives an allocation, its full requested quantity unless the concentration cap or proration at the margin reduces it; a bid priced below the clearing price receives nothing.

### What determines an allocation

The clearing price and every allocation are computed from the full set of revealed bids against the offering's fixed reserve price, concentration cap, and diversity floor, not from any single bidder's own bid in isolation. See Clearing and verification.

### Refunds and claims

Whatever portion of a bidder's escrow doesn't convert to payment at settlement credits to that bidder's balance in the pull-payment ledger: the full escrow, for a bid that received no allocation, or the difference between escrow and the amount actually owed, for one that did. Retrieving it requires calling `claim()`; it is not pushed automatically. See Settlement and claims, including the current known gap in the reference frontend's `claim()` UI (Known issues).

If an offering cannot meet its own diversity requirement at any price, it resolves as cancelled rather than settling under-diversified. Every bidder's full escrow becomes claimable, and no tokens are minted.

### Participating beyond bidding

A bidder may also propose or challenge a clearing for the offerings they've bid into, the same way an issuer or an unrelated observer can. See The challenge window.
