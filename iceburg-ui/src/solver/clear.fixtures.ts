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
  name: "integer rounding can under-diversify a correctly-computed price floor",
  bids: [
    { bidder: addr(1), qty: 10n, price: 10n, eligible: true },
    { bidder: addr(2), qty: 1n, price: 5n, eligible: true },
    { bidder: addr(3), qty: 1n, price: 5n, eligible: true },
    { bidder: addr(4), qty: 1n, price: 5n, eligible: true },
  ],
  params: { supply: 11n, reservePrice: 1n, cap: 100n, minHolders: 3n },
  expected: {
    kind: "cleared",
    price: 5n,
    allocations: new Map([
      [addr(1), 10n],
      [addr(2), 1n],
    ]),
  },
};

export const allFixtures: Fixture[] = [
  capPeelingFixture,
  clampedOversubscriptionFixture,
  unresolvedFixture,
  diversityRoundingShortfallFixture,
];
