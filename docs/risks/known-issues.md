# Known issues

These are limitations that have been identified and, as of this writing, have no protocol-level fix. Each is stated with its effect and its mitigation, if any.

## Integer rounding can under-diversify a correctly-computed price floor

**Issue:** the diversity price floor `p*` is derived correctly from a bid set that genuinely contains at least `minHolders` distinct qualifying bidders, but the realized allocation at the margin can still assign zero units to one or more of the bidders tied there, when remaining supply at that price is smaller than the number of bidders tied at it.

**Effect:** a clearing computed from a correctly-derived `p*` can still fail the on-chain diversity check (fewer than `minHolders` bidders end up with a positive allocation), even though a bid set that does support the diversity requirement exists. See the fourth worked example in [Clearing and verification](../the-offering-lifecycle/clearing-and-verification.md).

**Mitigation:** none at the protocol level. This is the safe failure direction, since the verifier simply rejects such a clearing rather than settling under-diversified, but the offering can be left without any accepted clearing as a result, at small enough bid-to-supply ratios.

## No eligibility re-check at settlement

**Issue:** a bid's `eligible` flag is set once, at reveal, from the attestation presented at that moment, and is never re-evaluated.

**Effect:** if the attestor whose signature backed a given reveal is revoked from the registry after that reveal but before settlement, the bid remains eligible for the rest of that offering. Settlement can still mint to that bidder.

**Mitigation:** none in this build; named as a deferred hardening item. See [Eligibility and attestation](../eligibility-and-attestation.md).

## claim() has no dedicated UI

**Issue:** the reference frontend's typed contract bindings include `claim()` and `claimable(address)`, but as of this writing no component in that frontend calls either.

**Effect:** after an offering reaches `SETTLED` or `CANCELLED`, retrieving a `claimable` balance currently requires calling the contract directly (e.g. via a block explorer's write-contract interface), not through an in-app button.

**Mitigation:** none yet. This describes the current state of the reference frontend, not a protocol limitation. The ledger itself is unaffected, and a balance remains claimable indefinitely regardless of when a UI for it exists.

## MAX_BIDS = 64

**Issue:** total commits per offering are hard-capped at 64.

**Effect:** an offering cannot exceed 64 total commits; a larger real-world offering would need a different architecture (batched or paginated verification) than this build implements.

**Mitigation:** the cap is enforced as an explicit revert at commit time, never as a silent truncation discovered later.

## Live deployment status

**Issue:** as of this writing, only a local development chain has a broadcast `AttestorRegistry`/`IssuanceFactory` deployment. Arbitrum One, Arbitrum Sepolia, and both Robinhood Chain networks are wired into the protocol's deployment configuration (chain IDs, RPC endpoints, USDG addresses; see [Payment currency and networks](../payment-currency-and-networks.md)) but do not yet have a live factory deployment broadcast to them.

**Effect:** creating a real offering is currently only possible on a local development chain.

**Mitigation:** none needed beyond deploying. The contracts and deployment scripts are network-agnostic; this reflects sequencing, not a blocker.
