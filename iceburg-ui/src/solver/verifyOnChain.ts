import type { Address, Bid } from "./types";

// A faithful TypeScript port of contracts/src/Issuance.sol's verifyClearing
// (as of the P4-7 fix). Two, and only two, things use this:
//
// 1. clear.ts self-checks a candidate allocation against it before ever
//    claiming `{ kind: "cleared" }` — see the comment on `finish()` there
//    for why. This makes "a solver-cleared result always passes the
//    on-chain verifier" true by construction, not by hoping every
//    combinatorial edge case of the water-filling algorithm was found and
//    fixed by hand.
// 2. clear.verifier-differential.test.ts uses it as an oracle to fuzz the
//    solver against, independent of whatever internal logic clear.ts
//    happens to use.
//
// If contracts/src/Issuance.sol's verifyClearing changes, this port needs
// to change with it, or both uses above stop meaning anything.
export function verifyOnChain(
  bids: readonly Bid[],
  cap: bigint,
  supply: bigint,
  minHolders: bigint,
  reservePrice: bigint,
  clearingPrice: bigint,
  allocations: readonly bigint[],
): { ok: true } | { ok: false; reason: string } {
  const n = bids.length;
  if (allocations.length !== n) return { ok: false, reason: "AllocationLengthMismatch" };
  if (clearingPrice < reservePrice) return { ok: false, reason: "ReserveNotMet" };

  let rationedQty = 0n;
  let rationedAllocated = 0n;
  let totalAllocated = 0n;
  let distinctWinners = 0;

  for (let i = 0; i < n; i++) {
    const b = bids[i];
    const allocation = allocations[i];

    if (allocation > cap) return { ok: false, reason: `CapExceeded(${i})` };

    const maxAllowed = b.qty < cap ? b.qty : cap;
    if (b.price < clearingPrice) {
      if (allocation !== 0n) return { ok: false, reason: `ThresholdViolation(${i})` };
    } else if (allocation > maxAllowed) {
      return { ok: false, reason: `ThresholdViolation(${i})` };
    } else if (allocation < maxAllowed) {
      rationedQty += b.qty;
      rationedAllocated += allocation;
    }

    if (allocation > 0n && !b.eligible) return { ok: false, reason: `IneligibleBidder(${i})` };

    totalAllocated += allocation;
    if (allocation > 0n) distinctWinners++;
  }

  if (totalAllocated > supply) return { ok: false, reason: "SupplyExceeded" };
  if (BigInt(distinctWinners) < minHolders) return { ok: false, reason: "DiversityNotMet" };

  for (let i = 0; i < n; i++) {
    const bi = bids[i];
    if (bi.price < clearingPrice) continue;
    for (let j = i + 1; j < n; j++) {
      const bj = bids[j];
      if (bj.price !== bi.price || bj.qty !== bi.qty) continue;
      const ai = allocations[i];
      const aj = allocations[j];
      const diff = ai > aj ? ai - aj : aj - ai;
      if (diff > 1n) return { ok: false, reason: `SamePriceTierSplit(${i},${j})` };
    }
  }

  if (rationedQty > 0n) {
    for (let i = 0; i < n; i++) {
      const b = bids[i];
      const allocation = allocations[i];
      const maxAllowed = b.qty < cap ? b.qty : cap;
      if (b.price >= clearingPrice && allocation < maxAllowed) {
        const expectedFloor = (rationedAllocated * b.qty) / rationedQty;
        if (allocation !== expectedFloor && allocation !== expectedFloor + 1n) {
          return { ok: false, reason: `ProrationInconsistent(${i})` };
        }
      }
    }
  }

  return { ok: true };
}

export function allocationsInBidOrder(
  bids: readonly Bid[],
  allocations: ReadonlyMap<Address, bigint>,
): bigint[] {
  return bids.map((b) => allocations.get(b.bidder) ?? 0n);
}
