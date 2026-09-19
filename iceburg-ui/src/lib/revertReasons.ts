import { BaseError, ContractFunctionRevertedError } from "viem";

const WINDOW_CLOSED_MESSAGE = "This window has already closed.";
const WINDOW_STILL_OPEN_MESSAGE = "This window hasn't closed yet.";
const CAP_EXCEEDED_MESSAGE = "That allocation exceeds the per-bidder cap for this offering.";

const ERROR_MESSAGES: Record<string, string> = {
  ZeroAddress: "This requires a valid address — the zero address isn't allowed here.",
  ZeroAmount: "This requires a non-zero amount.",
  InvalidCapBps: "The per-bidder cap must be between 0% and 100%.",
  ZeroCap: "The computed per-bidder cap is zero — check the supply and cap settings.",
  NoApprovedAttestors: "This offering has no approved attestors configured.",
  TooManyApprovedAttestors: "Too many approved attestors — reduce the list size.",
  CommitWindowNotInFuture: "The commit window must end in the future.",
  RevealWindowNotAfterCommitWindow: "The reveal window must end after the commit window.",
  ZeroChallengeWindowLength: "The challenge window must be longer than zero.",
  MinHoldersExceedsSupply: "The minimum holder count can't exceed the total supply.",
  WrongState: "This action isn't available right now — the offering is in a different stage.",
  CommitWindowElapsed: WINDOW_CLOSED_MESSAGE,
  CommitWindowStillOpen: WINDOW_STILL_OPEN_MESSAGE,
  RevealWindowElapsed: WINDOW_CLOSED_MESSAGE,
  RevealWindowStillOpen: WINDOW_STILL_OPEN_MESSAGE,
  BondTooLow: "The bond you provided is below the required minimum.",
  EmptyCommitment: "A commitment value is required.",
  AlreadyCommitted: "This address has already committed a bid for this offering.",
  MaxBidsReached: "This offering has reached its maximum number of bids.",
  NoCommitment: "No committed bid was found for this address.",
  CommitmentMismatch: "The revealed bid doesn't match the original sealed commitment.",
  InvalidAttestation: "The compliance attestation is invalid or wasn't signed by an approved attestor.",
  AllocationLengthMismatch: "The number of allocations doesn't match the number of bids.",
  ReserveNotMet: "That price is below the offering's minimum reserve price.",
  ThresholdViolation: CAP_EXCEEDED_MESSAGE,
  CapExceeded: CAP_EXCEEDED_MESSAGE,
  IneligibleBidder: "An allocation was proposed for a bidder who isn't eligible to win.",
  SupplyExceeded: "The proposed allocation exceeds the total supply for sale.",
  DiversityNotMet: "The proposed result doesn't spread ownership across enough distinct holders.",
  ProrationInconsistent: "The proposed allocation doesn't match the required pro-rata split at this price.",
  ChallengeWindowElapsed: WINDOW_CLOSED_MESSAGE,
  DoesNotBeatStanding: "This doesn't beat the current best offer — try a higher price or a larger allocation.",
  DiversityAchievable: "A result meeting the ownership-spread requirement is achievable — this one doesn't meet it.",
  ChallengeWindowStillOpen: WINDOW_STILL_OPEN_MESSAGE,
  AlreadyFinalized: "This offering has already been settled.",
  OwnableUnauthorizedAccount: "The connected wallet isn't authorized to perform this action.",
  AttestorAlreadyApproved: "This address is already an approved attestor.",
  AttestorNotApproved: "This address isn't an approved attestor.",
};

export function getRevertReason(error: unknown): string {
  if (error instanceof BaseError) {
    const revertError = error.walk((err) => err instanceof ContractFunctionRevertedError);

    if (revertError instanceof ContractFunctionRevertedError) {
      const errorName = revertError.data?.errorName;
      if (errorName && errorName in ERROR_MESSAGES) {
        return ERROR_MESSAGES[errorName];
      }
      if (revertError.reason) {
        return revertError.reason;
      }
    }

    return error.shortMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}
