import type { Address, Bid, ClearResult, IssuanceParams } from "./types";

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
  const priceCeiling = priceFloor(eligible, params.minHolders);

  if (priceCeiling === undefined) {
    return { kind: "unresolved" };
  }

  let active = eligible;
  let remainingSupply = params.supply;
  const finalized = new Map<Address, bigint>();

  const maxRounds = eligible.length + 1;
  for (let round = 0; round < maxRounds; round++) {
    const { price, allocations } = computeRound(active, remainingSupply, priceCeiling);

    const violators = active.filter((b) => {
      const allocation = allocations.get(b.bidder) ?? 0n;
      return allocation > params.cap;
    });

    if (violators.length === 0) {
      for (const [addr, qty] of allocations) {
        if (qty > 0n) finalized.set(addr, qty);
      }
      return { kind: "cleared", price, allocations: finalized };
    }

    for (const bid of violators) finalized.set(bid.bidder, params.cap);
    const violatorKeys = new Set(violators.map((b) => addressKey(b.bidder)));
    active = active.filter((b) => !violatorKeys.has(addressKey(b.bidder)));
    remainingSupply -= params.cap * BigInt(violators.length);
  }

  throw new Error("clear: exceeded the theoretical round bound — this indicates a bug, not a valid input");
}
