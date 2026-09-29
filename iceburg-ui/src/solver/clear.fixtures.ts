import type { Address, Bid, ClearResult, IssuanceParams } from "./types";

function addr(n: number): Address {
  return `0x${n.toString(16).padStart(40, "0")}` as Address;
}

export interface Fixture {
  name: string;
  bids: Bid[];
  params: IssuanceParams;
  expected: ClearResult;
}

export const capPeelingFixture: Fixture = {
  name: "cap-peeling re-clears freed supply",
  bids: [
    { bidder: addr(1), qty: 60n, price: 10n, eligible: true },
    { bidder: addr(2), qty: 50n, price: 8n, eligible: true },
    { bidder: addr(3), qty: 40n, price: 5n, eligible: true },
  ],
  params: { supply: 100n, reservePrice: 1n, cap: 50n, minHolders: 2n },
  expected: {
    kind: "cleared",
    price: 8n,
    allocations: new Map([
      [addr(1), 50n],
      [addr(2), 50n],
    ]),
  },
};

export const clampedOversubscriptionFixture: Fixture = {
  name: "clamping folds above-ceiling demand into the shared pro-rated group",
  bids: [
    { bidder: addr(1), qty: 80n, price: 20n, eligible: true },
    { bidder: addr(2), qty: 80n, price: 15n, eligible: true },
    { bidder: addr(3), qty: 10n, price: 5n, eligible: true },
    { bidder: addr(4), qty: 10n, price: 3n, eligible: true },
  ],
  params: { supply: 100n, reservePrice: 1n, cap: 100n, minHolders: 3n },
  expected: {
    kind: "cleared",
    price: 5n,
    allocations: new Map([
      [addr(1), 48n],
      [addr(2), 47n],
      [addr(3), 5n],
    ]),
  },
};

export const unresolvedFixture: Fixture = {
  name: "diversity floor unreachable at any price",
  bids: [
    { bidder: addr(1), qty: 20n, price: 15n, eligible: true },
    { bidder: addr(2), qty: 20n, price: 12n, eligible: true },
  ],
  params: { supply: 100n, reservePrice: 10n, cap: 50n, minHolders: 5n },
  expected: { kind: "unresolved" },
};

export const diversityRoundingShortfallFixture: Fixture = {
  name: "integer rounding under-diversifying a correctly-computed price floor resolves as unresolved",
  // priceFloor finds price=5 as the level where 3 distinct bidders first
  // appear (addr1 alone at price 10, then addr2/addr3/addr4 at price 5) —
  // a necessary condition for minHolders=3, but not sufficient. Only 1 unit
  // of supply remains for the 3-way tied marginal tier at price 5 once
  // addr1 is filled, so integer proration floors two of the three to zero:
  // realized diversity is 2 (addr1, addr2), short of minHolders=3.
  //
  // Originally hand-verified (Milestone 2, P1-5) as a *cleared* result —
  // {price: 5, allocations: {addr1: 10, addr2: 1}} — treating the
  // under-diversification as an acceptable, documented quirk rather than a
  // bug. It was never checked against the actual on-chain verifyClearing:
  // that allocation has only 2 distinct winners against minHolders=3, and
  // Issuance.sol's DiversityNotMet check would reject it outright. Found by
  // clear.verifier-differential.test.ts (backlog.md P4-20) and corrected —
  // clear() now recognizes a realized-diversity shortfall and reports
  // `unresolved` instead of a `cleared` result the verifier would bounce.
  bids: [
    { bidder: addr(1), qty: 10n, price: 10n, eligible: true },
    { bidder: addr(2), qty: 1n, price: 5n, eligible: true },
    { bidder: addr(3), qty: 1n, price: 5n, eligible: true },
    { bidder: addr(4), qty: 1n, price: 5n, eligible: true },
  ],
  params: { supply: 11n, reservePrice: 1n, cap: 100n, minHolders: 3n },
  expected: { kind: "unresolved" },
};

export const allFixtures: Fixture[] = [
  capPeelingFixture,
  clampedOversubscriptionFixture,
  unresolvedFixture,
  diversityRoundingShortfallFixture,
];
