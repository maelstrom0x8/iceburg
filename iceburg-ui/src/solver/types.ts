export type Address = `0x${string}`;

export interface Bid {
  bidder: Address;
  qty: bigint;
  price: bigint;
  eligible: boolean;
}

export interface IssuanceParams {
  supply: bigint;
  reservePrice: bigint;
  cap: bigint;
  minHolders: bigint;
}

export type ClearResult =
  | { kind: "cleared"; price: bigint; allocations: Map<Address, bigint> }
  | { kind: "unresolved" };
