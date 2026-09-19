import { ISSUANCE_STATE } from "../../lib/issuanceStage";

const STATE_CONFIG: Record<
  number,
  { label: string; className: string }
> = {
  [ISSUANCE_STATE.COMMIT_OPEN]: {
    label: "Commit open",
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/30",
  },
  [ISSUANCE_STATE.REVEAL_OPEN]: {
    label: "Reveal open",
    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-blue-500/30",
  },
  [ISSUANCE_STATE.CLEARING_PENDING]: {
    label: "Awaiting clearing",
    className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-amber-500/30",
  },
  [ISSUANCE_STATE.CHALLENGE_OPEN]: {
    label: "Challenge open",
    className: "bg-orange-500/15 text-orange-600 dark:text-orange-400 ring-orange-500/30",
  },
  [ISSUANCE_STATE.SETTLED]: {
    label: "Settled",
    className: "bg-purple-500/15 text-purple-600 dark:text-purple-400 ring-purple-500/30",
  },
  [ISSUANCE_STATE.CANCELLED]: {
    label: "Cancelled",
    className: "bg-red-500/15 text-red-600 dark:text-red-400 ring-red-500/30",
  },
};

const FALLBACK_CONFIG = {
  label: "Unknown",
  className: "bg-black/5 dark:bg-white/10 text-black/50 dark:text-white/50 ring-black/10 dark:ring-white/20",
};

interface StateBadgeProps {
  state: number | undefined;
  /** Additional CSS class names */
  className?: string;
}

export function StateBadge({ state, className = "" }: StateBadgeProps) {
  const config =
    state !== undefined ? (STATE_CONFIG[state] ?? FALLBACK_CONFIG) : FALLBACK_CONFIG;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${config.className} ${className}`}
    >
      {state !== undefined ? config.label : "—"}
    </span>
  );
}
