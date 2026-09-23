import type { ReactNode } from "react";

/**
 * A browser-window-chrome frame used to present a static, illustrative
 * rendering of a real screen (the create-offering form, a clearing
 * outcome) as a single authored image-like artifact — the same visual
 * device aave.com uses to show its real app once per section, rather than
 * embedding a live, interactive widget in the marketing page.
 */
export function FramedDeviceMock({
  children,
  dark = false,
}: {
  children: ReactNode;
  dark?: boolean;
}) {
  const tokens = dark
    ? {
        frame: "#1c1f2a",
        chrome: "#14161d",
        border: "rgba(255,255,255,0.09)",
      }
    : {
        frame: "var(--color-app-surface)",
        chrome: "var(--color-app-surface-2)",
        border: "var(--color-app-border)",
      };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: tokens.frame,
        border: `1px solid ${tokens.border}`,
        boxShadow: "0 24px 60px -20px rgba(0,0,0,0.35)",
      }}
    >
      <div
        className="flex items-center gap-1.5 px-4 py-3"
        style={{ background: tokens.chrome, borderBottom: `1px solid ${tokens.border}` }}
      >
        <span className="size-2.5 rounded-full" style={{ background: "#ef4444" }} aria-hidden="true" />
        <span className="size-2.5 rounded-full" style={{ background: "#f59e0b" }} aria-hidden="true" />
        <span className="size-2.5 rounded-full" style={{ background: "#22c55e" }} aria-hidden="true" />
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}
