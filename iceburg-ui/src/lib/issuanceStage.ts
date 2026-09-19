export const ISSUANCE_STATE_LABELS: Record<number, string> = {
  0: "Accepting bids",
  1: "Reveal open",
  2: "Awaiting a clearing proposal",
  3: "Challenge window open",
  4: "Settled",
  5: "Cancelled",
};

export function issuanceStageLabel(state: number): string {
  return ISSUANCE_STATE_LABELS[state] ?? "Unknown stage";
}

export const ISSUANCE_STATE = {
  COMMIT_OPEN: 0,
  REVEAL_OPEN: 1,
  CLEARING_PENDING: 2,
  CHALLENGE_OPEN: 3,
  SETTLED: 4,
  CANCELLED: 5,
} as const;
