import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export interface SubHeaderStat {
  label: string;
  value: ReactNode;
}

interface AppSubHeaderProps {
  /** Small icon or SVG element shown beside the title */
  icon?: ReactNode;
  title: string;
  description?: string;
  stats: SubHeaderStat[];
  /** Optional back-navigation link shown above the title */
  backTo?: { label: string; to: string };
}

/**
 * Aave-style sub-header bar: page identity on the left, key stats on the right.
 *
 * Layout reference:
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │  [icon]  Title (bold, xl)            Label   Label   Label  │
 *   │          Description (sm, muted)     Value   Value   Value  │
 *   └─────────────────────────────────────────────────────────────┘
 */
export function AppSubHeader({ icon, title, description, stats, backTo }: AppSubHeaderProps) {
  return (
    <div
      className="border-b px-6 py-5"
      style={{
        background: "var(--color-app-surface)",
        borderColor: "var(--color-app-border)",
      }}
    >
      <div className="mx-auto max-w-screen-xl">
        {backTo && (
          <Link
            to={backTo.to}
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-accent"
            style={{ color: "var(--color-app-muted)" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {backTo.label}
          </Link>
        )}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: identity */}
          <div className="flex items-center gap-3">
            {icon && (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full shrink-0"
                style={{ background: "var(--color-app-surface-2)" }}
              >
                {icon}
              </div>
            )}
            <div>
              <h1
                className="text-xl font-bold leading-tight"
                style={{ color: "var(--color-app-text)" }}
              >
                {title}
              </h1>
              {description && (
                <p
                  className="text-sm mt-0.5"
                  style={{ color: "var(--color-app-muted)" }}
                >
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Right: stats */}
          {stats.length > 0 && (
            <div className="flex items-center gap-10 sm:gap-12">
              {stats.map((stat, i) => (
                <div key={i}>
                  <div
                    className="text-xs font-medium uppercase tracking-wide"
                    style={{ color: "var(--color-app-muted)" }}
                  >
                    {stat.label}
                  </div>
                  <div
                    className="text-2xl font-bold mt-0.5 leading-none"
                    style={{ color: "var(--color-app-text)" }}
                  >
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
