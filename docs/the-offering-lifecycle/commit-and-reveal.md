# Commit and reveal

Bids are sealed. No party, including the issuer, can see a bid's quantity or price until the bidder reveals it, and reveal only becomes possible once the commit window has closed for everyone.

## Commit

`commitBid(commitment, bond)` stores a `bytes32` commitment and a bond, before `commitWindowEnd`. The commitment is expected to be `keccak256(abi.encode(qty, price, salt, bidder))`, checked at reveal time rather than at commit time, so a malformed or mismatched commitment simply cannot be successfully revealed later. One commitment per address; a second `commitBid` from the same address reverts. Total commits across the offering are capped at `MAX_BIDS = 64`, enforced at commit time. An offering that reaches the cap rejects further commits outright, rather than silently truncating the bid set later.

The bond must be at least `IssuanceParams.minBond`, the same floor used for proposing and challenging clearings.

## Reveal

`revealBid(qty, price, salt, attestationExpiry, attestationSignature)` is only callable during the reveal window, and only succeeds if `keccak256(abi.encode(qty, price, salt, sender))` matches the address's stored commitment and the attestation is valid (see [Eligibility and attestation](../eligibility-and-attestation.md)). On success, the bid is recorded, escrow of `qty × price` in the payment token is pulled from the bidder, and the original commit bond is refunded immediately.

`qty × price` must be nonzero, so a zero-quantity or zero-price reveal reverts.

## Bond forfeiture

When `closeRevealWindow()` runs, every address that committed but never revealed has its bond forfeited to the issuer, and a `BondForfeited` event is emitted for each one. This is the protocol's only mechanism against commit-and-ghost griefing: committing a slot in the (capped) bid array and then never revealing costs the committer their bond.
