import { describe, expect, it } from "vitest";
import type { Address } from "viem";
import { computeCommitment } from "./CommitPanel";

// Regression test for the bug where this function omitted the bidder
// address, so every commit produced a hash the contract's revealBid
// (keccak256(abi.encode(qty, price, salt, msg.sender))) would never accept.
// The expected hash below was produced independently via Foundry's `cast`
// (cast abi-encode "f(uint256,uint256,bytes32,address)" ... | cast keccak),
// not by re-deriving it through viem, so this actually cross-checks against
// Solidity's abi.encode rather than just testing this file against itself.
describe("computeCommitment", () => {
  it("matches keccak256(abi.encode(qty, price, salt, bidder)) as computed by Solidity/cast", () => {
    const qty = 1000n;
    const price = 8_000_000n;
    const salt = "0x0000000000000000000000000000000000000000000000000000001234567890" as `0x${string}`;
    const bidder = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as Address;

    const expected = "0xfe73951ce5fe08148b261a9dd07e8dbb074c490c06430eda23adf8fc4a3e04a3";

    expect(computeCommitment(qty, price, salt, bidder)).toBe(expected);
  });

  it("changes when the bidder address changes, for identical qty/price/salt", () => {
    const qty = 1000n;
    const price = 8_000_000n;
    const salt = "0x0000000000000000000000000000000000000000000000000000001234567890" as `0x${string}`;

    const a = computeCommitment(qty, price, salt, "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as Address);
    const b = computeCommitment(qty, price, salt, "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" as Address);

    expect(a).not.toBe(b);
  });
});
