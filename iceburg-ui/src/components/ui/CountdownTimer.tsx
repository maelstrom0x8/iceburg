import { useEffect, useState } from "react";
import { formatCountdown } from "../../lib/format";

interface CountdownTimerProps {
  /** Unix timestamp (seconds) as bigint or number */
  deadline: bigint | number | undefined;
  /** Extra CSS classes */
  className?: string;
}

/**
 * Renders a live-updating countdown to `deadline`.
 * Updates every second while the deadline is in the future.
 */
export function CountdownTimer({ deadline, className = "" }: CountdownTimerProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (deadline === undefined) return;

    const deadlineMs =
      typeof deadline === "bigint"
        ? Number(deadline) * 1000
        : deadline * 1000;

    if (deadlineMs <= Date.now()) return;

    const id = setInterval(() => setTick((n) => n + 1), 1_000);
    return () => clearInterval(id);
  }, [deadline]);

  if (deadline === undefined) {
    return <span className={className}>—</span>;
  }

  const text = formatCountdown(deadline);
  const isEnded = text === "Ended";

  return (
    <span
      className={`${isEnded ? "text-[var(--color-app-muted)]" : "text-amber-400"} ${className}`}
    >
      {text}
    </span>
  );
}
