# Clearing and verification

An offering's clearing price and allocation are computed off-chain, by a reference solver anyone can run, and only ever *verified* on-chain against the revealed bid data already in storage. The chain never searches for the best clearing. Instead, it checks whether a submitted one is feasible, in six bounded checks.

## Computing a clearing

Eligible bids are those revealed with a valid attestation and priced at or above the reserve price. The computation runs in two phases.

**Phase A: the diversity price floor.** Sort eligible bids by price descending, ties broken by bidder address ascending. `p*` is the price of the bid at which the count of distinct bidders seen so far first reaches `minHolders`. If fewer than `minHolders` distinct bidders exist even including every eligible bid down to the reserve price, `p*` is undefined and the offering has no valid clearing. See `proposeUnresolvedClearing` in [Architecture](../architecture.md#issuance) for that case. Where `p*` is defined, it is a *ceiling*: clearing at or below it can only admit the same or more distinct bidders than clearing above it.

**Phase B: capped clearing.** Standard uniform-price clearing finds the price at which cumulative demand crosses remaining supply. The per-bidder concentration cap complicates this: capping a bidder below their demand leaves supply unsold at that price, which can only be absorbed by admitting more, lower-priced demand, meaning the price must be lowered further. The solver resolves this iteratively:

```
active = eligible bids
remaining = supply

loop:
  find the natural (uncapped) marginal price over `active` and `remaining`
  if that natural price is undefined or does not exceed p*:
      clear at the natural price (or p*, if demand alone never exhausts supply);
      the marginal group is exactly the bids tied at that price
  else:
      the natural price would violate the diversity floor, so clamp to p*;
      the marginal group becomes every bid priced at or above p*
        (not only those exactly at p*, as explained below)

  pro-rate `remaining` across the marginal group; bids strictly above the
    clearing price and outside the marginal group fill in full

  violators = bids whose provisional allocation exceeds the concentration cap
  if none: done, return (price, allocations)
  else: lock each violator's allocation at the cap, remove them from
    `active`, subtract their cap units from `remaining`, and repeat
```

Each iteration either finishes or permanently removes at least one bidder from `active`, so the loop terminates in at most `n` rounds for `n` eligible bids.

**Why the clamped branch takes the entire ≥ p\* group, not only the bids exactly at p\*.** If the marginal group in the clamped case only included bids priced exactly at `p*`, and demand priced *above* `p*` already exceeded remaining supply on its own, giving all of that above-`p*` demand an unconditional full fill would oversell the offering, a direct violation of supply conservation. Folding the entire `price ≥ p*` set into one shared, pro-rated group whenever clamping actually occurs is what keeps the allocation from exceeding supply in that case.

**Proration.** For a marginal group with combined demand `totalQty` and `remaining` supply to split: if `remaining ≥ totalQty`, every bidder in the group gets their full requested quantity (this only happens when supply comfortably covers the group; skipping this case and applying the division formula directly could allocate a bidder more units than they asked for). Otherwise, each bidder's share is `⌊remaining × qty / totalQty⌋`, and the integer remainder is assigned one unit at a time, lowest bidder address first, until the group's total matches `remaining` exactly.

## What the chain verifies

`Issuance.verifyClearing(clearingPrice, allocations[])` is a public view function, usable standalone by anyone checking a candidate answer before submitting it, that performs six checks against the bid data already in storage:

1. **Reserve**: `clearingPrice ≥ reservePrice`.
2. **Cap compliance**: every `allocations[i] ≤ cap`, checked independently of every other rule.
3. **Threshold consistency**: a bid priced below `clearingPrice` must have allocation exactly `0`; a bid priced at or above it must have allocation `≤ min(qty, cap)`.
4. **Eligibility**: no bid with a positive allocation can have `eligible == false`.
5. **Supply conservation**: the sum of all allocations does not exceed `supply`.
6. **Diversity**: the count of bids with a positive allocation is at least `minHolders`.
7. **Proration consistency**: for every bid priced at or above the clearing price whose allocation falls short of its own individual ceiling (`min(qty, cap)`), the shortfall must be explained by the group-wide proration: its allocation must equal `⌊rationedAllocated × qty / rationedQty⌋` or that value plus one, where `rationedQty`/`rationedAllocated` are summed over exactly the bids in that same rationed situation.

The verifier accepts *any* valid `⌊·⌋` / `⌊·⌋ + 1` split across a rationed group, not only the one specific assignment the reference solver produces. Two proposals with the same price and the same total allocation but a different one-unit distribution of the remainder are both accepted, because they're economically identical (same revenue, same volume), and re-deriving the solver's exact address-ordered tie-break on-chain would reject economically equivalent answers for no correctness benefit.

Verification is deliberately not a maximality check. It certifies that a submission is *feasible*, never that it's the *best* feasible answer. Optimality comes from the challenge mechanism instead: see [The challenge window](the-challenge-window.md).

## Worked examples

Four fixtures, used identically by the off-chain solver's own test suite and by the on-chain verifier's tests, illustrate the algorithm concretely.

### Cap-peeling re-clears freed supply

Supply 100, reserve price 1, cap 50, `minHolders` 2.

| Bidder | Qty | Price |
|---|---|---|
| A | 60 | 10 |
| B | 50 | 8 |
| C | 40 | 5 |

The natural clearing price is 8 (A and B's combined demand of 110 exceeds supply at price 8). A's naive share at price 8 would exceed the cap of 50, so A is locked at exactly 50 and removed; the 10 units freed re-clear among the remaining pool at the same price. Result: **price 8**, A → 50, B → 50, C → 0.

### Clamping folds above-ceiling demand into the shared pro-rated group

Supply 100, reserve price 1, cap 100 (no binding cap), `minHolders` 3.

| Bidder | Qty | Price |
|---|---|---|
| A | 80 | 20 |
| B | 80 | 15 |
| C | 10 | 5 |
| D | 10 | 3 |

The natural, unconstrained clearing price would sit above 5 (A and B alone demand 160 against supply 100), but that would admit only 2 distinct bidders, below the `minHolders = 3` floor. `p*` (the price of the 3rd-ranked distinct bidder) is 5, so the price clamps to 5, and because demand priced above 5 (A + B = 160) already exceeds supply on its own, the entire `price ≥ 5` group, meaning A, B, and C together, shares one pro-rated allocation rather than A and B filling in full. Result: **price 5**, A → 48, B → 47, C → 5, D → 0.

### Diversity floor unreachable at any price

Supply 100, reserve price 10, cap 50, `minHolders` 5, only 2 eligible bidders. `p*` is undefined, because fewer than 5 distinct bidders exist even admitting every eligible bid. The offering has no valid clearing; only `proposeUnresolvedClearing` can succeed for it.

### Integer rounding can under-diversify a correctly-computed price floor

Supply 11, reserve price 1, cap 100, `minHolders` 3.

| Bidder | Qty | Price |
|---|---|---|
| A | 10 | 10 |
| B | 1 | 5 |
| C | 1 | 5 |
| D | 1 | 5 |

`p*` is correctly computed as 5, the price at which the 3rd distinct bidder is reached. But only 11 units of supply exist against A's 10-unit demand at price 10 and a 3-way tie for the remaining 1 unit at price 5: B, C, and D cannot all receive a positive allocation from a single remaining unit. The realized result clears at price 5 with A → 10 and exactly one of B/C/D → 1. That is 2 distinct winners, one short of the 3 that `p*`'s own derivation targeted. This is a genuine, named limitation of integer-quantity auctions at small scale, not a flaw in how `p*` is derived. See [Known issues](../risks/known-issues.md).
