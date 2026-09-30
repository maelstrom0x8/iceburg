import type { ReactNode } from "react";

export function FramedDeviceMock({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "var(--color-app-surface)",
        border: "1px solid var(--color-app-border)",
        boxShadow: "0 24px 60px -20px rgba(0,0,0,0.35)",
      }}
    >
      <div
        className="flex items-center gap-1.5 px-4 py-3"
        style={{ background: "var(--color-app-surface-2)", borderBottom: "1px solid var(--color-app-border)" }}
      >
        <span className="size-2.5 rounded-full" style={{ background: "#ef4444" }} aria-hidden="true" />
        <span className="size-2.5 rounded-full" style={{ background: "#f59e0b" }} aria-hidden="true" />
        <span className="size-2.5 rounded-full" style={{ background: "#22c55e" }} aria-hidden="true" />
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}
