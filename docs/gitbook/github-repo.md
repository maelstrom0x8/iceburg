# Github repo

The protocol's contracts, frontend, and deployment tooling are in a single [repository](https://github.com/maelstrom0x8/iceburg), licensed Apache 2.0.

### Layout

`contracts/` is the Foundry project. Its `src/` holds the four production contracts (`Issuance`, `IssuanceFactory`, `AttestorRegistry`, `SecurityToken`); `test/` holds unit, fuzz/invariant, and fork tests (the fork suite runs the full commit → reveal → clear → settle → claim lifecycle against the real, live USDG contract on Arbitrum Sepolia); `script/` holds deployment scripts and per-network configuration, including the verified USDG addresses (see Payment currency and networks).

`iceburg-ui/` is the reference frontend (React, TypeScript, wagmi/viem). It includes the off-chain reference clearing solver (`src/solver/`), referenced throughout Clearing and verification.

`scripts/sync-abi.mjs` generates typed contract bindings and per-chain deployed addresses for the frontend directly from Foundry's compiled output and broadcast records, so the frontend always reflects whatever has actually been deployed.

### Current build status

This is a buildathon-stage build. The full protocol lifecycle has been proven end to end on a local development chain, including against a live-forked USDG contract; live factory deployment to a public network has not yet been broadcast. See Known issues for the complete, current state.
