import { EXAMPLE_BIDS, EXAMPLE_PARAMS, EXAMPLE_RESULT, shortAddress } from "../data";

function formatPrice(cents: bigint): string {
  return `$${(Number(cents) / 100).toFixed(2)}`;
}

const winners = EXAMPLE_RESULT.kind === "cleared" ? EXAMPLE_RESULT.allocations : new Map();
const clearingPrice = EXAMPLE_RESULT.kind === "cleared" ? EXAMPLE_RESULT.price : 0n;
const totalAllocated = [...winners.values()].reduce((a, b) => a + b, 0n);
const winnerCount = [...winners.values()].filter((q) => q > 0n).length;

/**
 * Static rendering of the real clearing computation for the one example
 * offering used throughout the page — bidders identified by truncated
 * address (matching the real ledger's actual data shape, not invented
 * names), with an "Example offering" label beside the clearing price in
 * the same register aave.com uses for its "Simulated Rate" label.
 */
export function ClearingOutcomePanel() {
  return (
    <div className="space-y-5">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
              <th className="py-1.5 pr-3 font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
                Bidder
              </th>
              <th className="py-1.5 pr-3 text-right font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
                Qty
              </th>
              <th className="py-1.5 pr-3 text-right font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
                Price
              </th>
              <th className="py-1.5 text-right font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
                Allocated
              </th>
            </tr>
          </thead>
          <tbody>
            {EXAMPLE_BIDS.map((bid) => {
              const allocation = winners.get(bid.bidder) ?? 0n;
              return (
                <tr key={bid.bidder} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td className="py-1.5 pr-3" style={{ color: "rgba(255,255,255,0.85)" }}>
                    {shortAddress(bid.bidder)}
                    {!bid.eligible && (
                      <span className="ml-1.5 text-[10px]" style={{ color: "#f87171" }}>
                        ineligible
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3 text-right" style={{ color: "rgba(255,255,255,0.65)" }}>
                    {bid.qty.toLocaleString("en-US")}
                  </td>
                  <td className="py-1.5 pr-3 text-right" style={{ color: "rgba(255,255,255,0.65)" }}>
                    {formatPrice(bid.price)}
                  </td>
                  <td
                    className="py-1.5 text-right font-semibold"
                    style={{ color: allocation > 0n ? "#34d399" : "rgba(255,255,255,0.3)" }}
                  >
                    {allocation > 0n ? allocation.toLocaleString("en-US") : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        className="grid grid-cols-3 gap-4 rounded-lg p-4"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div>
          <div className="text-[10px] flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.45)" }}>
            Clearing price
            <span
              className="rounded-full px-1.5 py-0.5 text-[9px] font-medium"
              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.55)" }}
            >
              Example offering
            </span>
          </div>
          <div className="font-display text-2xl font-semibold mt-1" style={{ color: "var(--color-accent-light)" }}>
            {formatPrice(clearingPrice)}
          </div>
        </div>
        <div>
          <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>
            Winning bidders
          </div>
          <div className="text-2xl font-semibold mt-1" style={{ color: "#f0f2f5" }}>
            {winnerCount} <span className="text-sm font-normal" style={{ color: "rgba(255,255,255,0.4)" }}>/ {EXAMPLE_PARAMS.minHolders} min</span>
          </div>
        </div>
        <div>
          <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>
            Allocated
          </div>
          <div className="text-2xl font-semibold mt-1" style={{ color: "#f0f2f5" }}>
            {totalAllocated.toLocaleString("en-US")} <span className="text-sm font-normal" style={{ color: "rgba(255,255,255,0.4)" }}>/ {EXAMPLE_PARAMS.supply.toLocaleString("en-US")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
