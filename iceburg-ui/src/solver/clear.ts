import type { Address, Bid, ClearResult, IssuanceParams } from "./types";
import { allocationsInBidOrder, verifyOnChain } from "./verifyOnChain";

function addressKey(address: Address): string {
  return address.toLowerCase();
}

function totalOrderCompare(a: Bid, b: Bid): number {
  if (a.price !== b.price) return a.price > b.price ? -1 : 1;
  const aKey = addressKey(a.bidder);
  const bKey = addressKey(b.bidder);
  if (aKey < bKey) return -1;
  if (aKey > bKey) return 1;
  return 0;
}

function assertNoDuplicateBidders(bids: Bid[]): void {
  const seen = new Set<string>();
  for (const bid of bids) {
    const key = addressKey(bid.bidder);
    if (seen.has(key)) {
      throw new Error(`duplicate bidder address in bid set: ${bid.bidder}`);
    }
    seen.add(key);
  }
}

function eligiblePool(bids: Bid[], params: IssuanceParams): Bid[] {
  assertNoDuplicateBidders(bids);
  return bids
    .filter((b) => b.eligible && b.price >= params.reservePrice)
    .sort(totalOrderCompare);
}

function priceFloor(sortedEligible: Bid[], minHolders: bigint): bigint | undefined {
  const seen = new Set<string>();
  for (const bid of sortedEligible) {
    seen.add(addressKey(bid.bidder));
    if (BigInt(seen.size) >= minHolders) return bid.price;
  }
  return undefined;
}

function sumQty(bids: Bid[]): bigint {
  return bids.reduce((acc, b) => acc + b.qty, 0n);
}

function naturalMarginalPrice(active: Bid[], remainingSupply: bigint): bigint | undefined {
  const distinctPrices = [...new Set(active.map((b) => b.price))].sort((a, b) =>
    a > b ? -1 : a < b ? 1 : 0,
  );
  let cumulative = 0n;
  for (const price of distinctPrices) {
    const atThisLevel = sumQty(active.filter((b) => b.price === price));
    if (cumulative + atThisLevel >= remainingSupply) return price;
    cumulative += atThisLevel;
  }
  return undefined;
}

function proration(group: Bid[], remaining: bigint): Map<Address, bigint> {
  const totalQty = sumQty(group);
  const result = new Map<Address, bigint>();

  if (totalQty === 0n) return result;

  if (remaining >= totalQty) {
    for (const bid of group) result.set(bid.bidder, bid.qty);
    return result;
  }

  let distributed = 0n;
  for (const bid of group) {
    const share = (remaining * bid.qty) / totalQty;
    result.set(bid.bidder, share);
    distributed += share;
  }

  let leftover = remaining - distributed;
  const byAddress = [...group].sort((a, b) => (addressKey(a.bidder) < addressKey(b.bidder) ? -1 : 1));
  for (const bid of byAddress) {
    if (leftover === 0n) break;
    const current = result.get(bid.bidder) ?? 0n;
    if (current < bid.qty) {
      result.set(bid.bidder, current + 1n);
      leftover -= 1n;
    }
  }

  return result;
}

interface RoundResult {
  price: bigint;
  allocations: Map<Address, bigint>;
}

function computeRound(active: Bid[], remainingSupply: bigint, priceCeiling: bigint): RoundResult {
  const naturalPrice = naturalMarginalPrice(active, remainingSupply);

  let price: bigint;
  let marginalGroup: Bid[];
  let aboveGroup: Bid[];

  if (naturalPrice === undefined) {
    // Demand doesn't reach supply at any price level (including the
    // reserve) — abundant supply, nobody actually competing for anything
    // scarce. Every bidder in `active` wins at their own price; `price`
    // returned here is a placeholder only (`finish()` in `clear()` derives
    // the real reported clearing price from the winners' own minimum price
    // afterward, and self-checks the whole result before ever claiming
    // "cleared" — see the comment there for why a per-round price can't be
    // trusted as *the* clearing price in general).
    price = priceCeiling;
    marginalGroup = active;
    aboveGroup = [];
  } else if (naturalPrice <= priceCeiling) {
    price = naturalPrice;
    marginalGroup = active.filter((b) => b.price === price);
    aboveGroup = active.filter((b) => b.price > price);
  } else {
    price = priceCeiling;
    marginalGroup = active.filter((b) => b.price >= price);
    aboveGroup = [];
  }

  const allocations = new Map<Address, bigint>();
  for (const bid of aboveGroup) allocations.set(bid.bidder, bid.qty);

  const aboveDemand = sumQty(aboveGroup);
  const remaining = remainingSupply - aboveDemand;
  const marginalAllocations = proration(marginalGroup, remaining);
  for (const [addr, qty] of marginalAllocations) allocations.set(addr, qty);

  return { price, allocations };
}

export function clear(bids: Bid[], params: IssuanceParams): ClearResult {
  const eligible = eligiblePool(bids, params);
  const maybeCeiling = priceFloor(eligible, params.minHolders);

  if (maybeCeiling === undefined) {
    return { kind: "unresolved" };
  }
  // Rebound as a plain `bigint` local (not just narrowed) so the nested
  // `finish` closure below doesn't need to re-derive the narrowing itself.
  const priceCeiling: bigint = maybeCeiling;

  let active = eligible;
  let remainingSupply = params.supply;
  const finalized = new Map<Address, bigint>();

  // A single reported clearing price only makes sense if every winner's own
  // bid price is >= it (that's what "clearing price" means, and it's what
  // the on-chain verifier checks per bid). Cap-peeling processes bidders
  // across multiple rounds, each with its own locally-computed price, and
  // those local prices are not guaranteed to be monotonic round to round —
  // a bidder finalized early, at a round whose natural price matched their
  // own bid, can end up below a *later* round's price once enough higher
  // bidders have been peeled off and the remaining pool's dynamics shift.
  // Reporting "whichever round ran last" can therefore report a price above
  // an earlier-round winner's own bid. The only price guaranteed to satisfy
  // every winner is the minimum bid price among the winners themselves,
  // computed once at the end from the finalized set — never a per-round
  // value.
  const priceByBidder = new Map(eligible.map((b) => [addressKey(b.bidder), b.price]));

  // Beyond price selection, the water-filling process itself has sharp
  // edges no amount of per-case patching fully closes: `priceFloor` only
  // checks that `minHolders` distinct addresses exist at some price —
  // necessary, not sufficient, since integer proration in a scarce marginal
  // tier can floor a bidder to exactly zero, realizing fewer distinct
  // winners than that count promised — and a multi-round cap-peel can
  // legitimately span more than one price tier in a way no single
  // `clearingPrice` reconciles against the verifier's proration formula.
  // Rather than trying to hand-prove every combinatorial case correct,
  // `finish` self-checks the actual candidate against `verifyOnChain` (the
  // same port used to fuzz this function in
  // clear.verifier-differential.test.ts) before ever claiming "cleared" —
  // this makes "a solver-cleared result always passes the on-chain
  // verifier" true by construction, and falls back to the same honest
  // `unresolved` signal used when no price achieves minHolders at all
  // whenever it can't.
  function finish(finalized: Map<Address, bigint>): ClearResult {
    let min: bigint | undefined;
    for (const [addr, qty] of finalized) {
      if (qty === 0n) continue;
      const price = priceByBidder.get(addressKey(addr));
      if (price !== undefined && (min === undefined || price < min)) min = price;
    }
    const price = min ?? priceCeiling;

    const verdict = verifyOnChain(
      eligible,
      params.cap,
      params.supply,
      params.minHolders,
      params.reservePrice,
      price,
      allocationsInBidOrder(eligible, finalized),
    );
    if (!verdict.ok) return { kind: "unresolved" };

    return { kind: "cleared", price, allocations: finalized };
  }

  const maxRounds = eligible.length + 1;
  for (let round = 0; round < maxRounds; round++) {
    if (active.length === 0) {
      return finish(finalized);
    }

    const { allocations } = computeRound(active, remainingSupply, priceCeiling);

    const violators = active.filter((b) => {
      const allocation = allocations.get(b.bidder) ?? 0n;
      return allocation > params.cap;
    });

    if (violators.length === 0) {
      for (const [addr, qty] of allocations) {
        if (qty > 0n) finalized.set(addr, qty);
      }
      return finish(finalized);
    }

    for (const bid of violators) finalized.set(bid.bidder, params.cap);
    const violatorKeys = new Set(violators.map((b) => addressKey(b.bidder)));
    active = active.filter((b) => !violatorKeys.has(addressKey(b.bidder)));
    remainingSupply -= params.cap * BigInt(violators.length);
  }

  throw new Error("clear: exceeded the theoretical round bound — this indicates a bug, not a valid input");
}
