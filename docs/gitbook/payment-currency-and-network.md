# Payment Currency and Network

Each offering settles in a single ERC-20 payment token. The token's address is set per offering at `createIssuance`; it is not a protocol-level constant, and the contracts contain no logic specific to any one token. The protocol assumes a 6-decimal token, matching the `escrow = qty × price` arithmetic on the payment side.

### Testnet payment token

On the testnets, offerings use a free test token ("Demo USD", 6 decimals) that anyone can mint. It exists so the full lifecycle can be exercised without a faucet. It is deployed by `contracts/script/DeployDemoPaymentToken.s.sol`, which refuses to run on any network other than local Anvil, Arbitrum Sepolia and Robinhood Chain testnet.

| Network                   | Chain ID | Test token address                           |
| ------------------------- | -------- | -------------------------------------------- |
| Arbitrum Sepolia          | 421614   | `0x8da8D82A8f9812A2809C4D776770FE597B8efde0` |
| Robinhood Chain (testnet) | 46630    | `0xBA3C5B6b933640264A8823Cc288EAA8091E08242` |

No payment asset has been chosen for a mainnet deployment. The app resolves the payment token from its generated per-chain address map, so a chain with no entry has no payment token and offerings cannot be created there.

### Supported networks

Arbitrum One, Arbitrum Sepolia, Robinhood Chain (testnet and mainnet), and a local development chain. No chain-specific logic exists anywhere in the `Issuance`/`IssuanceFactory`/`AttestorRegistry`/`SecurityToken` contracts. Network choice is a deployment parameter, not an architectural one.

On local development chains, a 6-decimal demo payment token is deployed by the bootstrap target.

Current deployment status, meaning which of the networks above have an actual, live `AttestorRegistry`/`IssuanceFactory` and payment token deployment today, is tracked in Known issues.
