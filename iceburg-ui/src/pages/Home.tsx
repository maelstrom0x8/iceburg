import { MotionConfig } from "motion/react";
import { APP_URL } from "../config/urls";
import { FramedDeviceMock } from "../features/marketing/components/FramedDeviceMock";
import { EmptyLaunchFormMock } from "../features/marketing/components/EmptyLaunchFormMock";
import { ClearingOutcomePanel } from "../features/marketing/components/ClearingOutcomePanel";
import { StatTile } from "../features/marketing/components/StatTile";
import { DemandCurveChart } from "../features/marketing/components/DemandCurveChart";
import { Faq } from "../features/marketing/components/Faq";
import { Reveal, StaggerGroup, StaggerItem } from "../features/marketing/components/Reveal";
import { STAT_STRIP } from "../features/marketing/data";

const PRIMARY_BUTTON =
  "inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

const SECONDARY_BUTTON =
  "inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

const SECONDARY_BUTTON_ON_DARK =
  "inline-flex items-center justify-center rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50";

const AUDIENCE = {
  issuer: {
    eyebrow: "For issuers",
    tiles: [
      { label: "Locked at launch", caption: "Reserve price and caps can't change once bidding opens." },
      { label: "Enforced, not promised", caption: "The distribution floor is met automatically, or the offering doesn't settle." },
      { label: "Public by default", caption: "Every bid and result is inspectable — not a support ticket." },
    ],
  },
  bidder: {
    eyebrow: "For bidders",
    tiles: [
      { label: "Sealed until reveal", caption: "Nobody sees your bid first, including the issuer." },
      { label: "Ruled, not judged", caption: "Price and allocation follow the bids, not a person's call." },
      { label: "Refunded automatically", caption: "Not filled, or the offering doesn't clear — full refund, no manual step." },
    ],
  },
};

export function Home() {
  return (
    <MotionConfig reducedMotion="user">
      <main>
        {/* Hero */}
        <section
          className="relative overflow-hidden"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, color-mix(in srgb, var(--color-accent-light) 18%, transparent), transparent), var(--color-app-bg)",
          }}
        >
          <div className="relative mx-auto max-w-3xl px-4 pt-20 pb-14 text-center sm:px-6 sm:pt-28">
            <span className="inline-flex rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              Primary issuance protocol
            </span>
            <h1
              className="font-display mt-5 text-5xl font-semibold tracking-tight sm:text-6xl"
              style={{ color: "var(--color-app-text)" }}
            >
              The Verifiable Primary Market.
            </h1>
            <p className="mt-5 text-base leading-relaxed sm:text-lg" style={{ color: "var(--color-app-muted)" }}>
              Set the rules before bidding starts. Let the bids set the price. Check the result
              yourself.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href={`${APP_URL}/issue`} className={PRIMARY_BUTTON}>
                Launch an offering
              </a>
              <a
                href={`${APP_URL}/issuances`}
                className={SECONDARY_BUTTON}
                style={{ color: "var(--color-app-text)", border: "1px solid var(--color-app-border-2)" }}
              >
                View active offerings
              </a>
            </div>
          </div>

          <Reveal className="relative mx-auto max-w-2xl px-4 pb-20 sm:px-6" delay={0.15}>
            <FramedDeviceMock>
              <EmptyLaunchFormMock />
            </FramedDeviceMock>
          </Reveal>
        </section>

        {/* Stat strip */}
        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <Reveal>
            <p className="text-center text-sm" style={{ color: "var(--color-app-muted)" }}>
              One example offering, walked through below — terms fixed before bidding opens
            </p>
          </Reveal>
          <StaggerGroup className="mt-8 grid grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-6">
            {STAT_STRIP.map((stat) => (
              <StaggerItem key={stat.label} className="flex justify-center">
                <StatTile value={stat.value} prefix={stat.prefix} suffix={stat.suffix} label={stat.label} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        </section>

        {/* Dark section — deliberately fixed-dark regardless of system theme, for rhythm */}
        <section style={{ background: "#0d0e11" }} className="py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <Reveal>
              <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl" style={{ color: "#f0f2f5" }}>
                The bids compute the result. Anyone can check it.
              </h2>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <a href={`${APP_URL}/issue`} className={PRIMARY_BUTTON}>
                  Launch an offering
                </a>
                <a href="#faq" className={SECONDARY_BUTTON_ON_DARK}>
                  See how
                </a>
              </div>
            </Reveal>
          </div>

          <Reveal className="mx-auto max-w-2xl px-4 pt-14 sm:px-6" delay={0.1}>
            <FramedDeviceMock dark>
              <ClearingOutcomePanel />
            </FramedDeviceMock>
          </Reveal>

          <StaggerGroup className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-4 px-4 sm:grid-cols-3 sm:px-6">
            {[
              { label: "Fixed before bidding", caption: "Reserve, cap, and floor are locked at launch." },
              { label: "Computed from bids", caption: "Price and allocation follow the published rule, not a person." },
              { label: "Open to challenge", caption: "A better result replaces a worse one — and gets paid to." },
            ].map((tile) => (
              <StaggerItem
                key={tile.label}
                className="rounded-xl p-4"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="text-sm font-semibold" style={{ color: "#f0f2f5" }}>
                  {tile.label}
                </div>
                <div className="text-xs mt-1 leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {tile.caption}
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </section>

        {/* Isolated CTA */}
        <section className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold tracking-tight" style={{ color: "var(--color-app-text)" }}>
              Ready to run an offering on published rules?
            </h2>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <a href={`${APP_URL}/issue`} className={PRIMARY_BUTTON}>
                Get started
              </a>
              <a
                href={`${APP_URL}/issuances`}
                className={SECONDARY_BUTTON}
                style={{ color: "var(--color-app-text)", border: "1px solid var(--color-app-border-2)" }}
              >
                Browse offerings
              </a>
            </div>
          </Reveal>
        </section>

        {/* Audience stat-grid */}
        <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-8">
            {[AUDIENCE.issuer, AUDIENCE.bidder].map((group) => (
              <div key={group.eyebrow}>
                <Reveal>
                  <span className="text-xs font-semibold uppercase tracking-wide text-accent">{group.eyebrow}</span>
                </Reveal>
                <StaggerGroup className="mt-4 space-y-4">
                  {group.tiles.map((tile) => (
                    <StaggerItem key={tile.label}>
                      <div className="text-sm font-semibold" style={{ color: "var(--color-app-text)" }}>
                        {tile.label}
                      </div>
                      <div className="text-sm mt-1 leading-relaxed" style={{ color: "var(--color-app-muted)" }}>
                        {tile.caption}
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerGroup>
              </div>
            ))}
          </div>
        </section>

        {/* Chart */}
        <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-center" style={{ color: "var(--color-app-text)" }}>
              Where the price actually comes from
            </h2>
            <p className="mt-3 text-sm text-center max-w-lg mx-auto" style={{ color: "var(--color-app-muted)" }}>
              Demand crosses supply at $7.00 — but that would leave too few distinct holders. The
              floor pulls the price down to admit one more, and the result is $6.50.
            </p>
          </Reveal>
          <Reveal
            delay={0.1}
            className="mt-8 rounded-xl p-5 sm:p-8"
            style={{ background: "var(--color-app-surface)", border: "1px solid var(--color-app-border)" }}
          >
            <DemandCurveChart />
          </Reveal>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-center" style={{ color: "var(--color-app-text)" }}>
              Common questions
            </h2>
          </Reveal>
          <Reveal delay={0.1} className="mt-8">
            <Faq />
          </Reveal>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto max-w-2xl px-4 pb-24 sm:px-6">
          <Reveal>
            <div
              className="rounded-xl px-6 py-10 text-center sm:px-12"
              style={{ background: "var(--color-app-surface)", border: "1px solid var(--color-app-border)" }}
            >
              <h2 className="font-display text-2xl font-semibold tracking-tight" style={{ color: "var(--color-app-text)" }}>
                See it running.
              </h2>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--color-app-muted)" }}>
                Step through an active offering, or set your own terms and open one.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <a href={`${APP_URL}/issuances`} className={PRIMARY_BUTTON}>
                  View active offerings
                </a>
                <a
                  href={`${APP_URL}/issue`}
                  className={SECONDARY_BUTTON}
                  style={{ color: "var(--color-app-text)", border: "1px solid var(--color-app-border-2)" }}
                >
                  Launch an offering
                </a>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
    </MotionConfig>
  );
}
