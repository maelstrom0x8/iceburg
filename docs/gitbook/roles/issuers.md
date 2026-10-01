# Issuers

The issuer is the party bringing a tokenized security to market. There is exactly one issuer per offering, set at `createIssuance` and never changed afterward.

### What an issuer configures

At offering creation, an issuer sets: total supply, reserve price, concentration cap (as a percentage of supply), minimum distinct-holder count, minimum bond for commits/proposals/challenges, the approved payment token, the approved attestor set, and the commit/reveal/challenge window lengths. Every one of these is immutable for the life of the offering. There is no setter for any of them, and no code path that reads a changed value mid-offering.

### What an issuer cannot do

Once an offering is live, the issuer holds no privileged code path in the clearing process. `proposeClearing`, `challengeClearing`, `closeCommitWindow`, `closeRevealWindow`, `closeChallengeWindow`, `settle`, and `cancelUnresolved` all run identical logic regardless of caller identity. There is no `onlyIssuer` branch anywhere in the clearing or settlement path. The issuer cannot loosen the reserve price, cap, or diversity floor after seeing which bids came in, cannot settle a proposal early, and cannot override an allocation the verification checks accept.

### What an issuer receives

Sale proceeds credit to the issuer's balance in the same pull-payment ledger every other party uses (see Settlement and claims), retrieved via `claim()` rather than pushed automatically. An issuer also receives the forfeited bond of any address that committed but never revealed.

### What an issuer can still do, like anyone else

An issuer may propose or challenge a clearing for their own offering the same way a bidder or an unrelated observer can. Participation isn't restricted; only the ability to substitute discretion for the verification checks is.
