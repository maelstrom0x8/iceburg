import { describe, expect, it } from "vitest";
import { EXAMPLE_BIDS, EXAMPLE_PARAMS, EXAMPLE_RESULT } from "./data";

// Guards the landing page's one worked example against a data edit
// silently losing the properties it exists to demonstrate: the
// concentration cap binding, the diversity floor binding, and an
// ineligible bid being excluded.
describe("landing page illustrative offering", () => {
  it("clears at $6.50, not the ~$7.00+ a naive uncapped market would produce", () => {
    expect(EXAMPLE_RESULT.kind).toBe("cleared");
    if (EXAMPLE_RESULT.kind !== "cleared") return;
    expect(EXAMPLE_RESULT.price).toBe(6_50n);
  });

  it("caps the top two bidders below what they asked for", () => {
    if (EXAMPLE_RESULT.kind !== "cleared") throw new Error("expected a cleared result");
    const top = EXAMPLE_BIDS[0];
    const second = EXAMPLE_BIDS[1];
    expect(EXAMPLE_RESULT.allocations.get(top.bidder)).toBe(EXAMPLE_PARAMS.cap);
    expect(EXAMPLE_RESULT.allocations.get(top.bidder)).toBeLessThan(top.qty);
    expect(EXAMPLE_RESULT.allocations.get(second.bidder)).toBe(EXAMPLE_PARAMS.cap);
    expect(EXAMPLE_RESULT.allocations.get(second.bidder)).toBeLessThan(second.qty);
  });

  it("admits exactly the minimum required distinct holders", () => {
    if (EXAMPLE_RESULT.kind !== "cleared") throw new Error("expected a cleared result");
    const winners = [...EXAMPLE_RESULT.allocations.values()].filter((qty) => qty > 0n);
    expect(BigInt(winners.length)).toBe(EXAMPLE_PARAMS.minHolders);
  });

  it("excludes the ineligible bid entirely", () => {
    if (EXAMPLE_RESULT.kind !== "cleared") throw new Error("expected a cleared result");
    const ineligible = EXAMPLE_BIDS.find((b) => !b.eligible);
    expect(ineligible).toBeDefined();
    expect(EXAMPLE_RESULT.allocations.get(ineligible!.bidder) ?? 0n).toBe(0n);
  });

  it("allocates exactly the full supply", () => {
    if (EXAMPLE_RESULT.kind !== "cleared") throw new Error("expected a cleared result");
    const total = [...EXAMPLE_RESULT.allocations.values()].reduce((a, b) => a + b, 0n);
    expect(total).toBe(EXAMPLE_PARAMS.supply);
  });
});
