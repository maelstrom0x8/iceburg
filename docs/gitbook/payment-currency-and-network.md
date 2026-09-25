# Payment Currency and Network

Offerings settle in USDG (Paxos' Global Dollar), a 6-decimal, regulated, reserve-backed stablecoin that is the native asset on Robinhood Chain, one of Iceburg's named deployment targets. Any address's `paymentToken` is set per offering at `createIssuance`; USDG is the intended production payment token, not a protocol-level constant.

### USDG addresses

Four addresses, each independently verified on-chain (`name()`, `symbol()`, `decimals()` confirmed against the live contract on its respective network, not taken from documentation alone):

| Network                   | Chain ID | USDG address                                 |
| ------------------------- | -------- | -------------------------------------------- |
| Arbitrum Sepolia          | 421614   | `0xFFC95faa3d63Cde504a05B567C600B78C0b41892` |
| Arbitrum One              | 42161    | `0x004B506865409877C9fA29bfb1ebA929984B9bbC` |
| Robinhood Chain (testnet) | 46630    | `0x7E955252E15c84f5768B83c41a71F9eba181802F` |
| Robinhood Chain (mainnet) | 4663     | `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` |

USDG is 6-decimal on every network above, the same decimal count `escrow = qty × price` already assumes for the payment side of the protocol, so no protocol-level change is needed to accommodate it.

### Supported networks

Arbitrum One, Arbitrum Sepolia, Robinhood Chain (testnet and mainnet), and a local development chain. No chain-specific logic exists anywhere in the `Issuance`/`IssuanceFactory`/`AttestorRegistry`/`SecurityToken` contracts. Network choice is a deployment parameter, not an architectural one.

On local development chains, a 6-decimal demo payment token stands in for USDG, since no real USDG deployment exists there.

Current deployment status, meaning which of the networks above have an actual, live `AttestorRegistry`/`IssuanceFactory` deployment today versus only USDG-address configuration wired in, is tracked in Known issues.
