# Github repo

The protocol's contracts, frontend, and deployment tooling are in a single [repository](https://github.com/maelstrom0x8/iceburg), licensed Apache 2.0.

### Layout

`contracts/` is the Foundry project. Its `src/` holds the four production contracts (`Issuance`, `IssuanceFactory`, `AttestorRegistry`, `SecurityToken`); `test/` holds unit and fuzz/invariant tests; `script/` holds deployment scripts, including the test payment token deploy (see Payment currency and networks).

`iceburg-ui/` is the reference frontend (React, TypeScript, wagmi/viem). It includes the off-chain reference clearing solver (`src/solver/`), referenced throughout Clearing and verification.

`scripts/sync-abi.mjs` generates typed contract bindings and per-chain deployed addresses for the frontend directly from Foundry's compiled output and broadcast records, so the frontend always reflects whatever has actually been deployed.

### Current build status

This is a buildathon-stage build. The full protocol lifecycle is covered end to end by the automated test suite. The factory, registry and a test payment token are deployed on Arbitrum Sepolia and Robinhood Chain testnet. See Known issues for the complete, current state.
