# Gas-sponsored bidding

An optional, experimental feature that lets a bidder's commit transaction be gas-sponsored rather than paid directly from their own wallet, using ZeroDev's ERC-7702 kernel-account infrastructure layered on top of whatever wallet the bidder already connected.

## How it works

Rather than replacing a bidder's wallet with a separate smart-account wallet, the feature wraps the connected wallet in an EIP-7702 kernel account and routes the commit transaction through a ZeroDev paymaster. EIP-7702 mode is used specifically so the bidder's on-chain identity in `commitBid`/`revealBid` stays their own wallet address. A bidder who opts into sponsored bidding is still, on-chain, the same address as if they hadn't.

## Current status

Opt-in only, via a checkbox on the commit step of the reference frontend; the checkbox itself is hidden entirely unless a ZeroDev project ID is configured, so the default (unconfigured) path is unaffected by this feature's presence. It currently covers the commit step only. Reveal and claim are not yet wrapped with the same sponsorship option. No live sponsored transaction has been verified end to end against real ZeroDev credentials as of this writing; the construction path (kernel account → paymaster client → kernel account client) has been checked for structural and type correctness, and a construction failure, such as an invalid or misconfigured project ID, surfaces as a clear, on-brand error message rather than a raw SDK error, but sponsorship itself remains unconfirmed in production use.

This is a genuinely optional layer on top of the core protocol, not a dependency of it. Every function described in [Architecture](architecture.md) and [Commit and reveal](the-offering-lifecycle/commit-and-reveal.md) works identically whether or not gas sponsorship is configured or used.
