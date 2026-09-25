# Attestors

An attestor is an address an issuer has approved to vouch for bidder eligibility, meaning the accreditation, jurisdiction, or identity verification the issuer's offering requires before a bid can be revealed. Each offering carries its own fixed set of 1–10 approved attestors, snapshotted from `AttestorRegistry` at creation.

## What an attestor signs

An attestation is an EIP-712 signature over a bidder's address and an expiry timestamp, bound to the specific `Issuance` instance and chain by the EIP-712 domain separator. Signing an attestation is the only action an attestor takes on-chain-relevant to the protocol; an attestor holds no other privileged function.

## The trust this role holds

Whether a bid is eligible in the first place rests entirely on the attestor(s) an issuer chose to approve. The protocol verifies that an attestation is validly signed by an approved attestor, but it does not and cannot verify the real-world claim (accreditation, jurisdiction, identity) the attestor is vouching for. This is a deliberate, named scope boundary: Iceburg removes discretion from *who gets how much at what price*, given a set of bids from already-eligible bidders; it does not remove trust from the determination of eligibility itself. See [Known risks and mitigations](../risks/known-risks-and-mitigations.md).

## Approval and revocation

Only the issuer (as `AttestorRegistry`'s owner) can approve or revoke an attestor. Revocation is forward-only: it prevents that attestor's signature from validating any *future* reveal, but has no effect on a bid already revealed under that attestor's signature in a live offering. See [Eligibility and attestation](../eligibility-and-attestation.md) for the reveal-time check itself. Revoking or approving an attestor in the registry also has no effect on any offering already created before the change, since each offering's attestor list is copied at construction and never re-read afterward.
