# Changelog

All notable changes to Iceburg are recorded in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and tagged releases use [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Coming Soon]

### Landed on main, not yet tagged

#### Added

- A link back to the offerings list from every offering's detail page.
- Transactions that revert on-chain are reported as failures. Previously a reverted transaction could appear as successful in the interface.

#### Changed

- Wallet transactions are submitted with extra fee headroom, so bids, approvals, and claims are less likely to fail on congested networks.
- The offerings list finds offerings by scanning from the factory's deployment block instead of the beginning of the chain, so it loads faster on networks with long histories.

#### Fixed

- Revealed bid details are read back with the correct field mapping for display.

### Planned

These items are on the roadmap and have not been built. Their order and scope may change before release.

#### Network availability

- **Arbitrum One and Robinhood Chain mainnet.** No payment token is configured for either network and no offering factory is deployed on either yet. Mainnet deployment will follow the same process used for the current testnets.

#### Bidding

- **In-app attestation.** The reveal step currently asks the bidder to paste an attestation expiry and signature by hand. A future release will request and attach the attestation inside the app.
- **Gas-sponsored reveal and claim.** Gas sponsorship is currently available only on the commit step, behind an opt-in toggle.
- **Eligibility re-check at settlement.** Today, a bid keeps the eligibility it had at reveal even if its attestor is later revoked. A planned hardening step will re-check eligibility before tokens are minted.
- **Offerings beyond 64 bidders.** The current build caps each offering at 64 commitments. Larger offerings need a verification path that processes bids in batches.
- **All-or-nothing (package) bids.** Bids that must be filled in full or not at all are not supported yet.

#### Tokens and governance

- **Transfer restrictions on the security token.** Secondary transfers will be limited to eligible holders. The current token mints to winners but does not restrict who can receive it afterward.
- **Attestor governance.** Attestor sets are managed only through the issuer's add and remove actions. Richer governance over attestor sets is planned.

#### Website

- **FAQ page.** The `/faq` route currently shows a placeholder.
- **Help center.** The `/help` route currently shows a placeholder.

#### Assurance

- **Independent security audit.** A third-party audit of the contracts and the interface is planned before any mainnet deployment.
