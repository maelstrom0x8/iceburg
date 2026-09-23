import { EXAMPLE_BIDS, EXAMPLE_PARAMS, UNCONSTRAINED_PRICE } from "../data";

const WIDTH = 600;
const HEIGHT = 280;
const MARGIN = { top: 20, right: 24, bottom: 34, left: 54 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;

const X_MAX = 14_000;
const Y_MIN = 5.0;
const Y_MAX = 9.5;

function x(qty: number): number {
  return MARGIN.left + (qty / X_MAX) * PLOT_W;
}

function y(price: number): number {
  return MARGIN.top + (1 - (price - Y_MIN) / (Y_MAX - Y_MIN)) * PLOT_H;
}

function dollars(cents: bigint): number {
  return Number(cents) / 100;
}

/**
 * A single, static, non-interactive chart — the demand curve for the
 * page's one worked example, showing where the clearing price actually
 * comes from and why the diversity floor pulls it below the price the
 * market alone would have produced. Hand-rolled inline SVG per the
 * dataviz skill's guidance (no chart library dependency for one static
 * chart); no hover layer, matching this page's deliberate "nothing
 * outside the FAQ accordion and nav is interactive" constraint.
 */
export function DemandCurveChart() {
  const eligible = EXAMPLE_BIDS.filter((b) => b.eligible);

  let cumulative = 0;
  const steps: { qtyStart: number; qtyEnd: number; price: number }[] = [];
  for (const bid of eligible) {
    const qtyStart = cumulative;
    cumulative += Number(bid.qty);
    steps.push({ qtyStart, qtyEnd: cumulative, price: dollars(bid.price) });
  }

  const pathParts: string[] = [`M ${x(0)} ${y(steps[0].price)}`];
  for (const step of steps) {
    pathParts.push(`L ${x(step.qtyEnd)} ${y(step.price)}`);
    const next = steps[steps.indexOf(step) + 1];
    if (next) pathParts.push(`L ${x(step.qtyEnd)} ${y(next.price)}`);
  }
  const curvePath = pathParts.join(" ");

  const supply = Number(EXAMPLE_PARAMS.supply);
  const clearingPrice = 6.5;
  const unconstrainedPrice = dollars(UNCONSTRAINED_PRICE);

  const yTicks = [5, 6, 7, 8, 9];

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto" role="img" aria-label="Demand curve for the example offering, showing the clearing price where cumulative demand meets supply">
        {/* gridlines + y labels */}
        {yTicks.map((price) => (
          <g key={price}>
            <line
              x1={MARGIN.left}
              x2={WIDTH - MARGIN.right}
              y1={y(price)}
              y2={y(price)}
              stroke="var(--color-app-border)"
              strokeWidth={1}
            />
            <text x={MARGIN.left - 10} y={y(price)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="var(--color-app-muted)">
              ${price}
            </text>
          </g>
        ))}

        {/* x axis label */}
        <text x={MARGIN.left} y={HEIGHT - 6} fontSize={11} fill="var(--color-app-muted)">
          0
        </text>
        <text x={x(X_MAX)} y={HEIGHT - 6} textAnchor="end" fontSize={11} fill="var(--color-app-muted)">
          {X_MAX.toLocaleString("en-US")} units demanded
        </text>

        {/* supply reference line */}
        <line
          x1={x(supply)}
          x2={x(supply)}
          y1={MARGIN.top}
          y2={HEIGHT - MARGIN.bottom}
          stroke="var(--color-app-muted-2)"
          strokeWidth={1.5}
          strokeDasharray="3 4"
        />
        <text x={x(supply) + 6} y={MARGIN.top + 12} fontSize={11} fill="var(--color-app-muted-2)">
          Supply: {supply.toLocaleString("en-US")}
        </text>

        {/* unconstrained (no-floor) price reference */}
        <line
          x1={MARGIN.left}
          x2={WIDTH - MARGIN.right}
          y1={y(unconstrainedPrice)}
          y2={y(unconstrainedPrice)}
          stroke="#f59e0b"
          strokeWidth={1.5}
          strokeDasharray="3 4"
          opacity={0.7}
        />
        <text x={WIDTH - MARGIN.right} y={y(unconstrainedPrice) - 6} textAnchor="end" fontSize={11} fill="#f59e0b">
          Without the floor: ~${unconstrainedPrice.toFixed(2)}
        </text>

        {/* demand curve */}
        <path d={curvePath} fill="none" stroke="var(--color-accent)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        {/* clearing point marker */}
        <circle cx={x(supply)} cy={y(clearingPrice)} r={5} fill="var(--color-accent)" stroke="var(--color-app-surface)" strokeWidth={2} />
        <text x={x(supply) + 8} y={y(clearingPrice) + 16} fontSize={12} fontWeight={600} fill="var(--color-accent)">
          Clearing price: ${clearingPrice.toFixed(2)}
        </text>
      </svg>
    </div>
  );
}
