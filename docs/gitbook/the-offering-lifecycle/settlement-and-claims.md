# Settlement and Claims

Funds and tokens do not move directly to bidders, the issuer, or a proposer during `settle()` or `cancelUnresolved()`. Both functions only ever credit a per-address pull-payment ledger (`claimable`); a separate `claim()` function, callable by anyone for themselves, is the only function that transfers payment tokens out of the contract.

### Why pull, not push

A regulated, freeze-capable stablecoin (the kind of asset Iceburg is designed to settle in; see Payment currency and networks) can freeze or blocklist an individual address at the token level. A settlement function that pushes tokens to every bidder in a loop would have one property: if any single address in that loop is frozen, the token transfer to it reverts, and because Solidity's call semantics revert the entire enclosing transaction, _every other bidder's_ payout in the same call fails too. One frozen address blocks the whole offering's settlement.

Converting `settle()`, `cancelUnresolved()`, and the bond-forfeiture step of `closeRevealWindow()` to credit-then-pull removes this failure mode entirely: crediting a `claimable` balance never calls the token contract, so it cannot revert on a frozen recipient. Only that recipient's own later `claim()` call can fail, and it fails in isolation. It can never block `settle()` itself, `cancelUnresolved()`, `closeRevealWindow()`, or any other address's `claim()`.

`challengeClearing`'s one exception: the beaten bond it pays out goes directly to `msg.sender`, the caller's own address for that specific call, so a revert there only ever fails the challenger's own transaction, with no shared-loop or third-party-address exposure to protect against.

### What settle() credits

For every bid with a positive allocation: the `SecurityToken` allocation mints directly to the bidder (minting is not routed through the pull ledger, since `SecurityToken` carries no recipient-side restriction and none of the freeze risk the payment token does), the difference between escrow and the amount owed (`escrow − clearingPrice × allocation`) credits to the bidder as a refund, and the amount owed credits to the issuer. Every bidder with no allocation has their full escrow credited back. The winning proposer's bond credits to their own balance.

`cancelUnresolved()` credits every bidder's full escrow and the standing proposer's bond, with no minting.

Both functions are guarded by a `finalized` flag rather than relying on `state` alone. `state` itself never leaves `SETTLED`/`CANCELLED` after a successful call, so a bare state check would not by itself prevent a second, double-executing call.

### claim()

`claim()` zeroes the caller's `claimable` balance _before_ transferring. The balance is gone from the ledger the moment the transfer is attempted, whether or not the transfer itself succeeds for a frozen address. It reverts `NothingToClaim` on a zero balance, and is otherwise callable by any address, any number of times, at any point after its balance becomes nonzero. There is no deadline and no dependency on offering state beyond having something to claim.
