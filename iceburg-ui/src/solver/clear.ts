import type { Address, Bid, ClearResult, IssuanceParams } from "./types";
import { allocationsInBidOrder, beatsOnChain, verifyOnChain, type OnChainVerdict } from "./verifyOnChain";

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

function proration(group: Bid[], remaining: bigint, minDistinctNeeded: bigint): Map<Address, bigint> {
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
  if (leftover === 0n) return result;

  const zeroBase = group.filter((b) => (result.get(b.bidder) ?? 0n) === 0n).sort(totalOrderCompare);
  const basePositiveCount = BigInt(group.length - zeroBase.length);
  const stillNeeded = minDistinctNeeded > basePositiveCount ? minDistinctNeeded - basePositiveCount : 0n;
  const diversityCount = stillNeeded < BigInt(zeroBase.length) ? stillNeeded : BigInt(zeroBase.length);

  const diversityFirst = zeroBase.slice(0, Number(diversityCount));
  const diversityFirstKeys = new Set(diversityFirst.map((b) => addressKey(b.bidder)));
  const order = [
    ...diversityFirst,
    ...group.filter((b) => !diversityFirstKeys.has(addressKey(b.bidder))).sort(totalOrderCompare),
  ];

  for (const bid of order) {
    if (leftover === 0n) break;
    const current = result.get(bid.bidder) ?? 0n;
    if (current < bid.qty) {
      result.set(bid.bidder, current + 1n);
      leftover -= 1n;
    }
  }

  return result;
}

function candidatePrices(eligible: Bid[]): bigint[] {
  return [...new Set(eligible.map((b) => b.price))].sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));
}

function computeRoundAtFixedPrice(
  active: Bid[],
  remainingSupply: bigint,
  fixedPrice: bigint,
  minDistinctNeeded: bigint,
): Map<Address, bigint> {
  const group = active.filter((b) => b.price >= fixedPrice);
  return proration(group, remainingSupply, minDistinctNeeded);
}

function clearAtFixedPrice(
  eligible: Bid[],
  params: IssuanceParams,
  fixedPrice: bigint,
): { result: ClearResult & { kind: "cleared" }; verdict: OnChainVerdict } | undefined {
  let active = eligible;
  let remainingSupply = params.supply;
  const finalized = new Map<Address, bigint>();

  const maxRounds = eligible.length + 1;
  for (let round = 0; round < maxRounds; round++) {
    if (active.length === 0) break;

    const minDistinctNeeded = params.minHolders - BigInt(finalized.size) > 0n
      ? params.minHolders - BigInt(finalized.size)
      : 0n;
    const allocations = computeRoundAtFixedPrice(active, remainingSupply, fixedPrice, minDistinctNeeded);

    const violators = active.filter((b) => {
      const allocation = allocations.get(b.bidder) ?? 0n;
      return allocation > params.cap;
    });

    if (violators.length === 0) {
      for (const [addr, qty] of allocations) {
        if (qty > 0n) finalized.set(addr, qty);
      }
      break;
    }

    for (const bid of violators) finalized.set(bid.bidder, params.cap);
    const violatorKeys = new Set(violators.map((b) => addressKey(b.bidder)));
    active = active.filter((b) => !violatorKeys.has(addressKey(b.bidder)));
    remainingSupply -= params.cap * BigInt(violators.length);

    if (round === maxRounds - 1) {
      throw new Error("clearAtFixedPrice: exceeded the theoretical round bound — this indicates a bug, not a valid input");
    }
  }

  const verdict = verifyOnChain(
    eligible,
    params.cap,
    params.supply,
    params.minHolders,
    params.reservePrice,
    fixedPrice,
    allocationsInBidOrder(eligible, finalized),
  );
  if (!verdict.ok) return undefined;

  return { result: { kind: "cleared", price: fixedPrice, allocations: finalized }, verdict };
}

export function clear(bids: Bid[], params: IssuanceParams): ClearResult {
  const eligible = eligiblePool(bids, params);
  const ceiling = priceFloor(eligible, params.minHolders);

  if (ceiling === undefined) {
    return { kind: "unresolved" };
  }

  let best: { result: ClearResult & { kind: "cleared" }; verdict: OnChainVerdict } | undefined;

  for (const price of candidatePrices(eligible)) {
    const candidate = clearAtFixedPrice(eligible, params, price);
    if (!candidate) continue;

    if (
      !best ||
      beatsOnChain(
        { ...candidate.verdict, clearingPrice: candidate.result.price },
        { ...best.verdict, clearingPrice: best.result.price },
      )
    ) {
      best = candidate;
    }
  }

  return best ? best.result : { kind: "unresolved" };
}
