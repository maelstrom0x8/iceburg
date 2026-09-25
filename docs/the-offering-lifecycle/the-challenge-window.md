# The challenge window

Once the reveal window closes, an offering enters `CLEARING_PENDING` with no standing proposal. Any address may submit one; any address may replace a standing proposal with a strictly better one until the challenge window closes.

## Proposing

`proposeClearing(clearingPrice, allocations[], bond)` runs `verifyClearing` (see [Clearing and verification](clearing-and-verification.md)) against the submission; on success it becomes the standing proposal, the offering moves to `CHALLENGE_OPEN`, and the challenge deadline is set to `now + challengeWindowLength`.

If no clearing can satisfy the offering's diversity requirement, because fewer than `minHolders` distinct bidders exist even including every bid down to the reserve price, `proposeClearing` cannot succeed for any input. `proposeUnresolvedClearing(bond)` is the alternative: it requires proving that condition (`distinctAtReserve < minHolders`; the call reverts `DiversityAchievable` otherwise) and sets the standing proposal to an unresolved claim rather than a priced clearing.

## Challenging

`challengeClearing(clearingPrice, allocations[], bond)` also runs `verifyClearing`, and additionally requires that the new proposal *beats* the current standing one:

- If the standing proposal is an unresolved claim, any valid priced clearing beats it unconditionally, since exhibiting a feasible sale is always preferable to exhibiting none.
- If the standing proposal is a priced clearing, the challenger's revenue (`clearingPrice × totalAllocated`) must strictly exceed the standing proposal's revenue, or tie it while strictly exceeding its total volume sold.

A challenge that doesn't beat the standing proposal reverts (`DoesNotBeatStanding`) rather than silently doing nothing.

On a successful challenge, the new proposal replaces the standing one and the challenge deadline resets to a full `challengeWindowLength` from the moment of the challenge. Every accepted challenge restarts the clock. The bond posted by the proposal that was just beaten is paid to `msg.sender`, the challenger who beat it, rather than returned to the beaten proposer. This is the protocol's core economic incentive: submitting a clearing that leaves revenue on the table, or that quietly fails one of the issuer's own stated terms, is a standing invitation for someone else to catch it and be paid the original proposer's stake for doing so.

## Why this terminates

Revenue is bounded above by `max(bid price) × supply`, and every accepted challenge strictly increases it (or, at a tie, strictly increases volume, itself bounded by `supply`). A strictly increasing, bounded, integer-valued sequence is finite, so the challenge tournament within one `CHALLENGE_OPEN` episode cannot cycle indefinitely. It must terminate. Whether it terminates *near* the best price the true bid set supports, versus merely terminating, is an economic question, not a protocol guarantee: see [Known risks and mitigations](../risks/known-risks-and-mitigations.md).

Once the challenge deadline passes with no further successful challenge, `closeChallengeWindow()` finalizes the standing proposal: `SETTLED` if it's a priced clearing, `CANCELLED` if it's an unresolved claim.
