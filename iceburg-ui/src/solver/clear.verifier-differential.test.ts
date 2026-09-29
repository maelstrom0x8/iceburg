import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { clear } from "./clear";
import { allocationsInBidOrder, verifyOnChain } from "./verifyOnChain";
import type { Address, Bid, IssuanceParams } from "./types";

// This is the differential property this codebase's own backlog names as
// its single highest-leverage missing test (docs/backlog.md P4-20): for
// every bid set the solver considers "cleared", the on-chain verifier must
// actually accept that exact allocation. Writing this test surfaced four
// real, previously-undiscovered bugs in clear.ts itself before this file
// ever passed (see backlog.md P4-20's writeup) — clear.ts now self-checks
// against the same verifyOnChain port before ever claiming "cleared" (see
// the comment on `finish()` in clear.ts), so this test is now a guard
// against regressing that self-check, not a hunt for new solver bugs.
function toAddress(n: number): Address {
  return `0x${n.toString(16).padStart(40, "0")}` as Address;
}

const bidArb = fc
  .record({
    index: fc.nat({ max: 12 }),
    qty: fc.bigInt({ min: 1n, max: 20n }),
    price: fc.bigInt({ min: 1n, max: 10n }),
  })
  .map(({ index, qty, price }) => ({
    bidder: toAddress(index),
    qty,
    price,
    eligible: true as const,
  }));

const bidsArb: fc.Arbitrary<Bid[]> = fc.uniqueArray(bidArb, {
  selector: (b) => b.bidder,
  minLength: 1,
  maxLength: 12,
});

// minHolders <= supply mirrors Issuance.sol's own constructor guard
// (MinHoldersExceedsSupply) — a real Issuance can never be created outside
// that constraint, so generating params that violate it would only surface
// "bugs" that are actually unreachable in production.
const paramsArb: fc.Arbitrary<IssuanceParams> = fc
  .record({
    supply: fc.bigInt({ min: 1n, max: 100n }),
    reservePrice: fc.bigInt({ min: 1n, max: 5n }),
    capFraction: fc.integer({ min: 1, max: 100 }),
    minHoldersFraction: fc.integer({ min: 0, max: 100 }),
  })
  .map(({ supply, reservePrice, capFraction, minHoldersFraction }) => {
    const minHolders = (supply * BigInt(minHoldersFraction)) / 100n || 1n;
    return {
      supply,
      reservePrice,
      cap: (supply * BigInt(capFraction)) / 100n || 1n,
      minHolders: minHolders > supply ? supply : minHolders,
    };
  });

describe("clear vs. the on-chain verifier (differential)", () => {
  it("every solver-cleared allocation is accepted by verifyClearing", () => {
    fc.assert(
      fc.property(bidsArb, paramsArb, (bids, params) => {
        const result = clear(bids, params);
        if (result.kind !== "cleared") return;

        const allocations = allocationsInBidOrder(bids, result.allocations);
        const verdict = verifyOnChain(
          bids,
          params.cap,
          params.supply,
          params.minHolders,
          params.reservePrice,
          result.price,
          allocations,
        );

        if (!verdict.ok) {
          throw new Error(
            `solver cleared at price=${result.price} but verifyClearing would reject: ${verdict.reason}\n` +
              `bids=${JSON.stringify(bids, (_, v) => (typeof v === "bigint" ? v.toString() : v))}\n` +
              `params=${JSON.stringify(params, (_, v) => (typeof v === "bigint" ? v.toString() : v))}\n` +
              `allocations=${allocations.join(",")}`,
          );
        }
      }),
      { numRuns: 2000 },
    );
  });

  it("regression: the exact Supply=1/Cap=1 tied-bidder case from the P4-7 fix", () => {
    const bids: Bid[] = [
      { bidder: toAddress(1), qty: 1n, price: 10n, eligible: true },
      { bidder: toAddress(2), qty: 1n, price: 10n, eligible: true },
    ];
    const params: IssuanceParams = { supply: 1n, reservePrice: 1n, cap: 1n, minHolders: 1n };

    const result = clear(bids, params);
    expect(result.kind).toBe("cleared");
    if (result.kind !== "cleared") return;

    const allocations = allocationsInBidOrder(bids, result.allocations);
    const verdict = verifyOnChain(
      bids,
      params.cap,
      params.supply,
      params.minHolders,
      params.reservePrice,
      result.price,
      allocations,
    );
    expect(verdict.ok).toBe(true);
  });

  it("regression: abundant supply fills every bidder at a price low enough that everyone's own bid qualifies", () => {
    // Two bidders at different prices; supply so abundant that demand never
    // reaches it at any level. Before the fix, this reported a clearing
    // price equal to whichever bidder happened to be highest, which the
    // verifier would then reject for excluding a legitimate lower bidder
    // (a bidder below the *reported* price winning anyway) — the actual
    // correct outcome here is that abundant supply means both bidders
    // legitimately win, and the reported price must be low enough (the
    // minimum among winners) that neither bidder's own threshold is
    // violated.
    const bids: Bid[] = [
      { bidder: toAddress(1), qty: 1n, price: 2n, eligible: true },
      { bidder: toAddress(2), qty: 1n, price: 1n, eligible: true },
    ];
    const params: IssuanceParams = { supply: 3n, reservePrice: 1n, cap: 1n, minHolders: 1n };

    const result = clear(bids, params);
    expect(result.kind).toBe("cleared");
    if (result.kind !== "cleared") return;
    expect(result.price).toBe(1n);
    expect(result.allocations.get(toAddress(1))).toBe(1n);
    expect(result.allocations.get(toAddress(2))).toBe(1n);
  });

  it("regression: a multi-round cap-peel doesn't report a price above an earlier round's winner", () => {
    const bids: Bid[] = [
      { bidder: toAddress(1), qty: 1n, price: 2n, eligible: true },
      { bidder: toAddress(2), qty: 2n, price: 1n, eligible: true },
    ];
    const params: IssuanceParams = { supply: 3n, reservePrice: 1n, cap: 1n, minHolders: 1n };

    const result = clear(bids, params);
    expect(result.kind).toBe("cleared");
    if (result.kind !== "cleared") return;

    const allocations = allocationsInBidOrder(bids, result.allocations);
    const verdict = verifyOnChain(bids, params.cap, params.supply, params.minHolders, params.reservePrice, result.price, allocations);
    expect(verdict.ok).toBe(true);
  });

  it("regression: a scarce marginal tier that can't reach minHolders resolves as unresolved, not a false cleared", () => {
    const bids: Bid[] = [
      { bidder: toAddress(0), qty: 1n, price: 5n, eligible: true },
      { bidder: toAddress(1), qty: 1n, price: 5n, eligible: true },
      { bidder: toAddress(2), qty: 1n, price: 5n, eligible: true },
      { bidder: toAddress(3), qty: 2n, price: 6n, eligible: true },
      { bidder: toAddress(4), qty: 2n, price: 6n, eligible: true },
    ];
    const params: IssuanceParams = { supply: 6n, reservePrice: 1n, cap: 2n, minHolders: 5n };

    const result = clear(bids, params);
    expect(result.kind).toBe("unresolved");
  });
});
