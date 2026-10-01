import { useState, type FormEvent } from "react";
import { MotionConfig } from "motion/react";
import { Link } from "react-router-dom";
import { Reveal, StaggerGroup, StaggerItem } from "../features/marketing/components/Reveal";

const PRIMARY_BUTTON =
  "inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

const SECONDARY_BUTTON =
  "inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

const WHY_ICEBURG_PILLARS = [
  {
    title: "Certainty Over Discretion",
    description:
      "We design systems where terms cannot shift post-launch. Once an offering is live, terms remain locked and immune to private issuer override.",
  },
  {
    title: "Verifiable Integrity",
    description:
      "Every outcome is mathematically computed from confirmed bids against fixed terms. Results are fully auditable by anyone in real time.",
  },
  {
    title: "Fair Market Access",
    description:
      "By decoupling compliance verification from pricing discretion, we ensure all eligible participants compete on an equal, transparent playing field.",
  },
];

export function About() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <main>
        {/* Section 1: About Us (Hero) */}
        <section
          className="relative overflow-hidden"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, color-mix(in srgb, var(--color-accent-light) 18%, transparent), transparent), var(--color-app-bg)",
          }}
        >
          <div className="relative mx-auto max-w-3xl px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28 sm:pb-20">
            <span className="inline-flex rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              About Us
            </span>
            <h1
              className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl"
              style={{ color: "var(--color-app-text)" }}
            >
              First sales run on terms that stay fixed.
            </h1>
            <p className="mt-5 text-base leading-relaxed sm:text-lg" style={{ color: "var(--color-app-muted)" }}>
              Iceburg is an organization dedicated to removing private bias from first sales. We build tools that let issuers and participants conduct offerings on clear, unchangeable terms.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/app/issuances" className={PRIMARY_BUTTON}>
                Use Iceburg
              </Link>
              <a
                href="mailto:contact@iceburg.io"
                className={SECONDARY_BUTTON}
                style={{ color: "var(--color-app-text)", border: "1px solid var(--color-app-border-2)" }}
              >
                Contact us
              </a>
            </div>
          </div>
        </section>

        {/* Section 2: Mission */}
        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <Reveal>
            <div
              className="rounded-2xl p-8 sm:p-12"
              style={{ background: "var(--color-app-surface)", border: "1px solid var(--color-app-border)" }}
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-accent">Our Mission</span>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: "var(--color-app-text)" }}>
                Bringing certainty to first sales
              </h2>
              <div className="mt-6 space-y-4 text-base leading-relaxed" style={{ color: "var(--color-app-muted)" }}>
                <p>
                  For decades, initial sales have depended on private issuer decisions. Pricing and allocations were set behind closed doors after seeing total interest, introducing uncertainty for participants.
                </p>
                <p>
                  Our mission is to establish a standard where every offering runs on fixed terms set before bidding opens. When terms are locked upfront and outcomes are computed directly from confirmed bids, sales become transparent, predictable, and fair for everyone.
                </p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Section 3: Why Iceburg */}
        <section className="py-20" style={{ background: "var(--color-app-surface-2)" }}>
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <Reveal className="text-center">
              <span className="text-xs font-semibold uppercase tracking-wide text-accent">Our Principles</span>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl" style={{ color: "var(--color-app-text)" }}>
                Why Iceburg
              </h2>
              <p className="mt-3 text-sm max-w-xl mx-auto" style={{ color: "var(--color-app-muted)" }}>
                The core convictions that shape our organization, product design, and system model.
              </p>
            </Reveal>

            <StaggerGroup className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {WHY_ICEBURG_PILLARS.map((pillar) => (
                <StaggerItem
                  key={pillar.title}
                  className="flex flex-col justify-between rounded-xl p-6"
                  style={{ background: "var(--color-app-surface)", border: "1px solid var(--color-app-border)" }}
                >
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: "var(--color-app-text)" }}>
                      {pillar.title}
                    </h3>
                    <p className="mt-3 text-xs leading-relaxed" style={{ color: "var(--color-app-muted)" }}>
                      {pillar.description}
                    </p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </section>

        {/* Section 4: Stay Updated (Newsletter Subscription) */}
        <section className="mx-auto max-w-2xl px-4 py-24 sm:px-6">
          <Reveal>
            <div
              className="rounded-2xl px-6 py-12 text-center sm:px-12"
              style={{ background: "var(--color-app-surface)", border: "1px solid var(--color-app-border)" }}
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-accent">Newsletter</span>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: "var(--color-app-text)" }}>
                Stay Updated
              </h2>
              <p className="mt-3 text-sm leading-relaxed max-w-md mx-auto" style={{ color: "var(--color-app-muted)" }}>
                Be the first to hear about news and product updates from Iceburg.
              </p>

              {subscribed ? (
                <div className="mt-8 rounded-full bg-accent/10 px-6 py-3 text-sm font-semibold text-accent inline-flex items-center gap-2">
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Thank you for subscribing!
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full sm:flex-1 rounded-full px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
                    style={{
                      background: "var(--color-app-bg)",
                      color: "var(--color-app-text)",
                      border: "1px solid var(--color-app-border-2)",
                    }}
                  />
                  <button type="submit" className={`${PRIMARY_BUTTON} w-full sm:w-auto shrink-0`}>
                    Subscribe
                  </button>
                </form>
              )}
            </div>
          </Reveal>
        </section>
      </main>
    </MotionConfig>
  );
}
