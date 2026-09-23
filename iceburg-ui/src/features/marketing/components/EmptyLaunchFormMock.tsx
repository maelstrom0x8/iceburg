/**
 * A static, inert recreation of the real issuer console's create-offering
 * form (`LaunchForm.tsx`) — same field set, same labels, same styling,
 * but nothing is filled in and nothing submits. This is the hero visual:
 * honest by construction, since there's no data to fabricate or disclaim.
 */
const inputStyle = {
  background: "var(--color-app-surface-2)",
  border: "1px solid var(--color-app-border)",
  color: "var(--color-app-muted)",
};

const labelStyle = { color: "var(--color-app-muted)" };

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={labelStyle}>
        {label}
      </label>
      <div
        className="w-full rounded-lg px-3 py-2 text-sm"
        style={inputStyle}
        aria-hidden="true"
      >
        <span className="opacity-60">{placeholder}</span>
      </div>
    </div>
  );
}

export function EmptyLaunchFormMock() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <div>
        <h3 className="text-base font-semibold" style={{ color: "var(--color-app-text)" }}>
          Create Sealed-Bid Offering
        </h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-app-muted)" }}>
          Terms are fixed here, before a single bid is submitted.
        </p>
      </div>

      <div
        className="rounded-lg p-4 space-y-3"
        style={{ background: "var(--color-app-surface-2)", border: "1px solid var(--color-app-border)" }}
      >
        <div className="text-xs font-medium" style={{ color: "var(--color-app-text)" }}>
          1. Security Token Details
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Token Name" placeholder="e.g. Acme Corp Series A" />
          <Field label="Token Symbol" placeholder="e.g. ACME" />
        </div>
      </div>

      <div
        className="rounded-lg p-4 space-y-3"
        style={{ background: "var(--color-app-surface-2)", border: "1px solid var(--color-app-border)" }}
      >
        <div className="text-xs font-medium" style={{ color: "var(--color-app-text)" }}>
          2. Supply &amp; Pricing
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Total Supply" placeholder="10,000" />
          <Field label="Reserve Price" placeholder="5.00" />
          <Field label="Per-Bidder Cap" placeholder="20%" />
          <Field label="Min Holders" placeholder="6" />
        </div>
      </div>
    </div>
  );
}
