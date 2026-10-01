# Architecture

Iceburg splits into a pure clearing computation and a verifying contract. The clearing computation, which determines which bid set produces which price and allocation, is deterministic and side-effect-free, and anyone can run it off-chain: the issuer, a bidder, or an unrelated third party. The verifying contract never runs that computation itself; its only job is to check, in bounded on-chain gas, whether a _submitted_ answer is feasible against the bid data it already holds, and to run a bonded tournament that converges on the best one anyone submits.

The verifying contract depends on nothing but the bid data already in its own storage and the parameters fixed at offering creation. It never calls out to the solver, an oracle, or anything off-chain to decide a result. The solver depends on nothing on-chain at all.

Four contracts make up the protocol. `Issuance` is deployed once per offering; `AttestorRegistry`, `IssuanceFactory`, and `SecurityToken` support it.

### AttestorRegistry

An owner-curated allow-list of the attestor addresses an issuer trusts to vouch for bidder eligibility. `Ownable`, constructed with the issuer as owner.

* `approveAttestor(address)` and `revokeAttestor(address)` are owner-only. Enumeration (`_attestors`) uses swap-and-pop with a one-based index map for O(1) revocation.
* `approvedAttestors()` returns the current list; `isApprovedAttestor(address)` performs a direct lookup.
* Events: `AttestorApproved(attestor)`, `AttestorRevoked(attestor)`.

An `Issuance` does not read this registry live. Its `approvedAttestors` list is copied into `IssuanceParams` once, at construction. See Eligibility and attestation for how this is used.

### IssuanceFactory

A stateless, permissionless factory. `createIssuance(IssuanceParams, issuer, tokenName, tokenSymbol)` performs three actions atomically, in this order:

1. Deploys a new `SecurityToken` (name/symbol as given, factory as its initial owner).
2. Deploys a new `Issuance` with the given parameters and `securityToken` set to the token just deployed.
3. Calls `securityToken.setMinter(issuance)`, then `securityToken.transferOwnership(issuer)`.

The ordering matters: `setMinter` is `onlyOwner`, and it can only be called once per token (see below). Wiring the minter before handing ownership to the issuer is what lets one `createIssuance` call atomically produce a fully-configured offering and token pair, so the issuer never has to take a separate action to authorize its own `Issuance` to mint.

`IssuanceFactory` emits its own `IssuanceCreated(issuance, securityToken, issuer, tokenName, tokenSymbol)`, a different event from `Issuance`'s own `IssuanceCreated` described below.

### SecurityToken

The asset being sold. A standard OpenZeppelin `ERC20` with two modifications:

* `decimals()` is hardcoded to `0`. Supply, quantities, the concentration cap, and every allocation are whole-unit share counts, so there is no 18-decimal scaling anywhere in the quantity side of the protocol. (Price stays denominated in the payment token's own decimals. See Payment currency and networks.)
* `minter` is settable exactly once, by the token's owner (`setMinter`, reverts `MinterAlreadySet` on a second call). `mint(address, amount)` is callable only by that minter.

Under the standard `IssuanceFactory` flow, the minter is always the paired `Issuance` contract, and it is the only address ever able to mint. `SecurityToken` carries no transfer restrictions beyond mint-gating. See Known issues for more.

### Issuance

One instance per offering. Holds all bid data, escrow, and the standing clearing proposal; inherits `ReentrancyGuard` and OpenZeppelin's `EIP712`.

**Parameters (`IssuanceParams`)** are fixed at construction and never mutated afterward, since no setter exists for any of them:

| Field                                                         | Meaning                                                                                                                                 |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `supply`                                                      | Total units offered                                                                                                                     |
| `reservePrice`                                                | Minimum acceptable clearing price                                                                                                       |
| `capBps`                                                      | Concentration cap, in basis points of `supply`; `cap = capBps * supply / 10_000`, computed once and stored as an immutable public field |
| `minHolders`                                                  | Minimum distinct winning addresses required                                                                                             |
| `minBond`                                                     | Minimum bond for `commitBid`, `proposeClearing`, `proposeUnresolvedClearing`, and `challengeClearing`                                   |
| `paymentToken` / `securityToken`                              | The ERC-20 used for bids/escrow, and the token being sold                                                                               |
| `approvedAttestors`                                           | 1–10 addresses, snapshotted from the registry at creation                                                                               |
| `commitWindowEnd`, `revealWindowEnd`, `challengeWindowLength` | Timing                                                                                                                                  |

Construction reverts on: a zero issuer, zero supply, zero reserve price, `capBps` outside `(0, 10_000]`, a computed cap of zero, `minHolders` of zero or greater than `supply`, zero or more than 10 approved attestors (or any zero address among them), a commit window not in the future, a reveal window not after the commit window, or a zero challenge-window length.

**Per-bid state (`Bid`)**: `{ bidder, qty, price, eligible, escrow }`. `eligible` is set `true` on every reveal and is not re-evaluated afterward. See Eligibility and attestation for what this means in practice. Total commits are capped at `MAX_BIDS = 64` (`MaxBidsReached`, enforced at commit time, not at reveal). Approved-attestor lookups are capped at `MAX_ATTESTORS = 10`.

**Standing proposal (`Proposal`)**: `{ clearingPrice, allocations[], proposer, bond, challengeDeadline, isUnresolvedClaim }`, a single struct fully overwritten on every accepted `proposeClearing`/`proposeUnresolvedClearing`/`challengeClearing`.

#### Lifecycle

```
COMMIT_OPEN → REVEAL_OPEN → CLEARING_PENDING → CHALLENGE_OPEN → SETTLED
                                                              ↘ CANCELLED
```

`SETTLED` and `CANCELLED` are terminal. Every transition below is callable by any address, and the issuer holds no special privilege once an offering is live.

| Transition                                                             | Guard                                                                                                                                             | Effect                                                                                                                 |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `commitBid(commitment, bond)`                                          | before `commitWindowEnd`; `bond ≥ minBond`; one commitment per address; total commits `< MAX_BIDS`                                                | stores the commitment and bond                                                                                         |
| `closeCommitWindow()`                                                  | after `commitWindowEnd`, from `COMMIT_OPEN`                                                                                                       | → `REVEAL_OPEN`                                                                                                        |
| `revealBid(qty, price, salt, attestationExpiry, attestationSignature)` | from `REVEAL_OPEN`, before `revealWindowEnd`; hash of `(qty, price, salt, sender)` matches the stored commitment; attestation valid and unexpired | records the bid, pulls `qty × price` escrow, refunds the commit bond                                                   |
| `closeRevealWindow()`                                                  | after `revealWindowEnd`, from `REVEAL_OPEN`                                                                                                       | → `CLEARING_PENDING`; forfeits the bond of every address that committed but never revealed, crediting it to the issuer |
| `proposeClearing(price, allocations[], bond)`                          | from `CLEARING_PENDING`; passes all six verification checks (below)                                                                               | becomes the standing proposal; → `CHALLENGE_OPEN`; challenge deadline set to `now + challengeWindowLength`             |
| `proposeUnresolvedClearing(bond)`                                      | from `CLEARING_PENDING`; the number of bids at or above the reserve price is genuinely below `minHolders`                                         | standing proposal becomes an unresolved claim; → `CHALLENGE_OPEN`                                                      |
| `challengeClearing(price, allocations[], bond)`                        | from `CHALLENGE_OPEN`, before the challenge deadline; passes verification; strictly beats the standing proposal                                   | replaces the standing proposal, resets the deadline; slashes the beaten proposal's bond to the challenger              |
| `closeChallengeWindow()`                                               | from `CHALLENGE_OPEN`, at or after the deadline                                                                                                   | → `SETTLED` if the standing proposal is a clearing, → `CANCELLED` if it's an unresolved claim                          |
| `settle()`                                                             | from `SETTLED`, once                                                                                                                              | mints each winner's allocation, credits payments/refunds/bond to the pull-payment ledger                               |
| `cancelUnresolved()`                                                   | from `CANCELLED`, once                                                                                                                            | credits every bidder's full escrow and the proposer's bond to the pull-payment ledger                                  |
| `claim()`                                                              | any time, any number of times                                                                                                                     | pays out the caller's own pull-payment ledger balance                                                                  |

Mechanism detail on the six verification checks, the challenge relation, and the pull-payment ledger is covered in Clearing and verification, The challenge window, and Settlement and claims.

#### Events

`IssuanceCreated`, `BidCommitted`, `CommitWindowClosed`, `BidRevealed`, `BondForfeited`, `RevealWindowClosed`, `ClearingProposed`, `UnresolvedClaimProposed`, `ClearingChallenged`, `ChallengeWindowClosed`, `WinnerSettled`, `NonWinnerRefunded`, `Settled`, `Cancelled`, `Claimed`.
