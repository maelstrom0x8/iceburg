# Glossary

**Clearing**: a proposed `(price, allocation)` pair for an offering: the price every winning bidder pays and how many units each of them receives.

**Standing proposal**: the currently-accepted clearing for an offering. Replaceable only by a strictly better, independently verified one before the challenge window closes.

**Feasibility**: whether a proposed clearing satisfies the six on-chain verification checks (reserve, supply conservation, threshold consistency, cap compliance, diversity, eligibility). This is distinct from *optimality*, which is never checked on-chain. See [Clearing and verification](the-offering-lifecycle/clearing-and-verification.md).

**Water-filling**: the iterative peel-and-reclear procedure that resolves the per-bidder concentration cap against uniform-price clearing: a bidder whose naive allocation would exceed the cap is locked at the cap, and the freed supply is re-cleared among the remaining bidders.

**Diversity floor / `p*`**: the price ceiling imposed by the offering's minimum-distinct-holder requirement. Clearing at or below `p*` can only ever admit the same or more distinct bidders than clearing above it.

**Proration**: the rule for splitting supply among bidders tied at the margin: floor division of each bidder's proportional share, with the integer remainder assigned one unit at a time, lowest bidder address first, until the group's allocation sums exactly.

**Attestation**: an off-chain, EIP-712-signed credential from an issuer-approved attestor, certifying that a specific address is eligible to bid, valid only until a stated expiry.

**Bond**: payment-token collateral required to commit a bid, propose a clearing, or challenge one. It is forfeited on a commit that's never revealed, and slashed to the challenger when a standing proposal is beaten.

**Slashing**: the transfer of a beaten proposal's bond to the challenger who beat it, at the moment `challengeClearing` succeeds.

**Challenge window**: the fixed period after a clearing is proposed during which anyone may replace it with a strictly better one. It resets to its full length on every accepted challenge.

**Escrow**: the payment-token amount (`quantity × price`) a bidder locks when revealing a bid, held until settlement determines how much of it converts to payment and how much refunds.

**Concentration cap**: the maximum units any single bidder may be allocated, fixed as a percentage of total supply at offering creation.

**Reserve price**: the minimum acceptable clearing price for an offering. No bid priced below it can ever receive an allocation.
