import type { ReactNode } from "react";

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
}

/**
 * Aave-style sub-header bar: page identity on the left, key stats on the right.
 * Rendered by each page component, slotted into the AppLayout sub-header zone.
 */
export function AppSubHeader({ icon, title, description, stats }: AppSubHeaderProps) {
  return (
    <div
      className="border-b px-6 py-5"
      style={{
        background: "var(--color-app-bg)",
        borderColor: "var(--color-app-border)",
      }}
    >
      <div className="mx-auto flex max-w-screen-xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: identity */}
        <div className="flex items-center gap-3">
          {icon && (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full shrink-0"
              style={{ background: "var(--color-app-surface-2)" }}
            >
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-lg font-semibold text-white leading-tight">{title}</h1>
            {description && (
              <p className="text-xs mt-0.5" style={{ color: "var(--color-app-muted)" }}>
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Right: stats */}
        {stats.length > 0 && (
          <div className="flex items-center gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-right">
                <div className="text-xs" style={{ color: "var(--color-app-muted)" }}>
                  {stat.label}
                </div>
                <div className="text-base font-semibold text-white mt-0.5">
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
