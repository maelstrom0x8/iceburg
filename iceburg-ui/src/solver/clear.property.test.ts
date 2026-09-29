import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { clear } from "./clear";
import type { Address, Bid, IssuanceParams } from "./types";

function toAddress(n: number): Address {
  return `0x${n.toString(16).padStart(40, "0")}` as Address;
}

const bidArb = fc
  .record({
    index: fc.nat({ max: 30 }),
    qty: fc.bigInt({ min: 1n, max: 1_000n }),
    price: fc.bigInt({ min: 1n, max: 100n }),
    eligible: fc.boolean(),
  })
  .map(({ index, qty, price, eligible }) => ({
    bidder: toAddress(index),
    qty,
    price,
    eligible,
  }));

const bidsArb: fc.Arbitrary<Bid[]> = fc
  .uniqueArray(bidArb, { selector: (b) => b.bidder })
  .filter((bids) => bids.length >= 1);

const paramsArb: fc.Arbitrary<IssuanceParams> = fc
  .record({
    supply: fc.bigInt({ min: 1n, max: 2_000n }),
    reservePrice: fc.bigInt({ min: 1n, max: 50n }),
    capFraction: fc.integer({ min: 1, max: 100 }),
    minHolders: fc.bigInt({ min: 1n, max: 5n }),
  })
  .map(({ supply, reservePrice, capFraction, minHolders }) => ({
    supply,
    reservePrice,
    cap: (supply * BigInt(capFraction)) / 100n || 1n,
    minHolders,
  }));

describe("clear — property-based", () => {
  it("the cleared price is always >= reservePrice", () => {
    fc.assert(
      fc.property(bidsArb, paramsArb, (bids, params) => {
        const result = clear(bids, params);
        if (result.kind === "cleared") {
          expect(result.price >= params.reservePrice).toBe(true);
        }
      }),
      { numRuns: 300 },
    );
  });

  it("no allocation ever exceeds the concentration cap", () => {
    fc.assert(
      fc.property(bidsArb, paramsArb, (bids, params) => {
        const result = clear(bids, params);
        if (result.kind === "cleared") {
          for (const allocation of result.allocations.values()) {
            expect(allocation <= params.cap).toBe(true);
          }
        }
      }),
      { numRuns: 300 },
    );
  });

  it("always terminates instead of looping forever", () => {
    fc.assert(
      fc.property(bidsArb, paramsArb, (bids, params) => {
        expect(() => clear(bids, params)).not.toThrow();
      }),
      { numRuns: 300 },
    );
  });

  it("supply conservation: total allocated never exceeds supply", () => {
    fc.assert(
      fc.property(bidsArb, paramsArb, (bids, params) => {
        const result = clear(bids, params);
        if (result.kind === "cleared") {
          let total = 0n;
          for (const allocation of result.allocations.values()) total += allocation;
          expect(total <= params.supply).toBe(true);
        }
      }),
      { numRuns: 300 },
    );
  });

  it("no bid is ever allocated more than it asked for", () => {
    fc.assert(
      fc.property(bidsArb, paramsArb, (bids, params) => {
        const result = clear(bids, params);
        if (result.kind === "cleared") {
          const qtyByBidder = new Map(bids.map((b) => [b.bidder, b.qty]));
          for (const [bidder, allocation] of result.allocations) {
            expect(allocation <= (qtyByBidder.get(bidder) ?? 0n)).toBe(true);
          }
        }
      }),
      { numRuns: 300 },
    );
  });

  it("when supply comfortably exceeds total demand, every winner gets exactly what they asked for", () => {
    const abundantArb = fc
      .array(
        fc.record({
          index: fc.nat({ max: 20 }),
          qty: fc.bigInt({ min: 1n, max: 10n }),
          price: fc.bigInt({ min: 10n, max: 100n }),
        }),
        { minLength: 1, maxLength: 15 },
      )
      .map((records) => {
        const seen = new Set<number>();
        const bids: Bid[] = [];
        for (const r of records) {
          if (seen.has(r.index)) continue;
          seen.add(r.index);
          bids.push({ bidder: toAddress(r.index), qty: r.qty, price: r.price, eligible: true });
        }
        return bids;
      })
      .filter((bids) => bids.length >= 1);

    fc.assert(
      fc.property(abundantArb, fc.bigInt({ min: 1n, max: 3n }), (bids, minHoldersRaw) => {
        const distinctCount = BigInt(bids.length);
        const minHolders = minHoldersRaw <= distinctCount ? minHoldersRaw : distinctCount;
        const totalDemand = bids.reduce((acc, b) => acc + b.qty, 0n);
        const params: IssuanceParams = {
          supply: totalDemand * 10n + 100n, // deliberately, generously abundant
          reservePrice: 1n,
          cap: totalDemand + 1n, // non-binding
          minHolders,
        };
        const result = clear(bids, params);
        expect(result.kind).toBe("cleared");
        if (result.kind === "cleared") {
          for (const bid of bids) {
            const allocation = result.allocations.get(bid.bidder) ?? 0n;
            if (allocation > 0n) expect(allocation).toBe(bid.qty);
          }
        }
      }),
      { numRuns: 200 },
    );
  });
});
