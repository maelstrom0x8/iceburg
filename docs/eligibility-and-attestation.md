# Eligibility and attestation

Revealing a bid requires a signed attestation from one of the offering's approved attestors, certifying that the revealing address is eligible to hold the security being sold.

## The attestation

An attestation is an EIP-712 signature over `Attestation(address bidder, uint64 expiry)`, in the `Issuance` contract's own domain (`"Iceburg Issuance"`, version `"1"`, bound to the specific `Issuance` instance and chain by the EIP-712 domain separator). At reveal, `Issuance` checks that:

- `block.timestamp` has not passed `expiry`, and
- the signature recovers to an address in the offering's `approvedAttestors` list.

An invalid, expired, or unapproved-signer attestation reverts the entire `revealBid` call. Escrow is never taken, and the commitment slot remains open for the bidder to retry within the reveal window.

## Where the attestor list comes from

`AttestorRegistry` is an issuer-owned allow-list (see [Architecture](architecture.md#attestorregistry)), but `Issuance` does not query it live. `approvedAttestors` is copied into `IssuanceParams` once, at `createIssuance`, and never re-read from the registry afterward. Revoking an attestor in the live registry has no effect on any offering already created before the revocation. Each offering's attestor set is frozen at construction, matching the immutability of every other launch parameter.

## What's fixed at reveal, not re-checked at settlement

A bid's `eligible` field is set `true` at reveal, the moment a valid attestation is presented, and is never re-evaluated afterward. If the attestor that signed a given bid's attestation is later revoked, that already-revealed bid remains eligible for the rest of that offering's lifecycle; only a *future* reveal under the revoked attestor's signature would fail. This is a named, deliberate tradeoff, not an oversight. See [Known issues](risks/known-issues.md).
