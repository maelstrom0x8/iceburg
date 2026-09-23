import { clear } from "../../solver/clear";
import type { Address, Bid, IssuanceParams } from "../../solver/types";

/**
 * One illustrative example, used consistently everywhere it appears on the
 * landing page (stat strip, the dark section's outcome panel, the demand
 * chart). No company name, no ticker, no named individuals — bidders are
 * identified only by truncated address, matching the real bid ledger's
 * actual data shape, so this reads as a worked example rather than a
 * fabricated case study. See docs/iceburg.doc plan notes for the honesty
 * reasoning behind that choice.
 */
export const EXAMPLE_PARAMS: IssuanceParams = {
  supply: 10_000n,
  reservePrice: 5_00n,
  cap: 2_000n,
  minHolders: 6n,
};

export const EXAMPLE_BIDS: Bid[] = [
  { bidder: "0x1a2b00000000000000000000000000000000001a", qty: 3_500n, price: 9_00n, eligible: true },
  { bidder: "0x3c4d00000000000000000000000000000000003c", qty: 2_500n, price: 8_50n, eligible: true },
  { bidder: "0x5e6f00000000000000000000000000000000005e", qty: 2_000n, price: 8_00n, eligible: true },
  { bidder: "0x7a8b00000000000000000000000000000000007a", qty: 1_800n, price: 7_50n, eligible: true },
  { bidder: "0x9c0d00000000000000000000000000000000009c", qty: 1_500n, price: 7_00n, eligible: true },
  { bidder: "0x1e2f00000000000000000000000000000000001e", qty: 1_200n, price: 6_50n, eligible: true },
  { bidder: "0x3a4b00000000000000000000000000000000003a", qty: 900n, price: 6_00n, eligible: true },
  { bidder: "0x5c6d00000000000000000000000000000000005c", qty: 600n, price: 5_50n, eligible: false },
];

export function shortAddress(address: Address): string {
  return `${address.slice(0, 6)}…`;
}

export const EXAMPLE_RESULT = clear(EXAMPLE_BIDS, EXAMPLE_PARAMS);

/** The price the market alone would have produced, ignoring the diversity floor — for the chart's "without the floor" marker. */
export const UNCONSTRAINED_PRICE = 7_00n;

export const STAT_STRIP = [
  { value: 10_000, prefix: "", suffix: "", label: "units offered" },
  { value: 5, prefix: "$", suffix: ".00", label: "reserve price" },
  { value: 20, prefix: "", suffix: "%", label: "per-bidder cap" },
  { value: 6, prefix: "", suffix: "", label: "min distinct holders" },
] as const;
