import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { FramedDeviceMock } from "./FramedDeviceMock";
import { EmptyLaunchFormMock } from "./EmptyLaunchFormMock";
import { DemandCurveChart } from "./DemandCurveChart";

const SLIDE_DURATION_MS = 6000;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function IssuerIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 13V3M10 3 6.5 6.5M10 3l3.5 3.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v3.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V12" />
    </svg>
  );
}

function ParticipantIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-5" aria-hidden="true">
      <rect x="4.5" y="9" width="11" height="7.5" rx="1.5" />
      <path strokeLinecap="round" d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5" aria-hidden="true">
      <rect x="5" y="4" width="3" height="12" rx="1" />
      <rect x="12" y="4" width="3" height="12" rx="1" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5" aria-hidden="true">
      <path d="M6 4.5v11l9-5.5-9-5.5Z" />
    </svg>
  );
}

interface CarouselSlide {
  id: string;
  label: string;
  icon: ReactNode;
  eyebrow: string;
  headline: string;
  subhead: string;
  ctaLabel: string;
  ctaHref: string;
  visual: ReactNode;
}

const SLIDES: CarouselSlide[] = [
  {
    id: "issuers",
    label: "Issuers",
    icon: <IssuerIcon />,
    eyebrow: "For issuers",
    headline: "Launch on fixed terms.",
    subhead:
      "Set the reserve price, the cap, and the holder floor once — nothing about them can move after bidding opens.",
    ctaLabel: "Launch an offering",
    ctaHref: "/app/issue",
    visual: (
      <FramedDeviceMock>
        <EmptyLaunchFormMock />
      </FramedDeviceMock>
    ),
  },
  {
    id: "participants",
    label: "Participants",
    icon: <ParticipantIcon />,
    eyebrow: "For participants",
    headline: "Bid sealed. Verified open.",
    subhead:
      "Nobody sees your bid first, including the issuer. Once bidding closes, anyone can check exactly how the result was reached.",
    ctaLabel: "View active offerings",
    ctaHref: "/app/issuances",
    visual: (
      <FramedDeviceMock>
        <DemandCurveChart />
      </FramedDeviceMock>
    ),
  },
];

const PRIMARY_BUTTON =
  "inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export function HeroCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [reducedMotion] = useState(prefersReducedMotion);
  const [paused, setPaused] = useState(prefersReducedMotion);

  const advance = useCallback(() => {
    setActiveIndex((i) => (i + 1) % SLIDES.length);
  }, []);

  const active = SLIDES[activeIndex];

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% -10%, color-mix(in srgb, var(--color-accent-light) 18%, transparent), transparent), var(--color-app-bg)",
      }}
    >
      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pt-32 pb-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:pt-40 lg:pb-20">
        <div className="text-left">
          <span className="inline-flex rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            {active.eyebrow}
          </span>
          <h1 className="mt-5 text-5xl font-semibold tracking-tight sm:text-6xl" style={{ color: "var(--color-app-text)" }}>
            {active.headline}
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed sm:text-lg" style={{ color: "var(--color-app-muted)" }}>
            {active.subhead}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to={active.ctaHref} className={PRIMARY_BUTTON}>
              {active.ctaLabel}
            </Link>
          </div>
        </div>

        <div className="relative flex items-center" style={{ minHeight: 420 }}>
          <div className="w-full">{active.visual}</div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div
          className="-mx-4 flex snap-x snap-mandatory items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:snap-none sm:overflow-visible sm:px-0"
        >
          {SLIDES.map((slide, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={slide.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-current={isActive}
                className="w-[190px] shrink-0 snap-start rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:w-[170px]"
                style={{
                  borderColor: isActive ? "var(--color-accent)" : "var(--color-app-border)",
                  background: isActive ? "color-mix(in srgb, var(--color-accent) 6%, transparent)" : "transparent",
                }}
              >
                <span className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--color-app-text)" }}>
                  {slide.icon}
                  {slide.label}
                </span>
                <span
                  className="relative mt-3 block h-0.5 w-full overflow-hidden rounded-full"
                  style={{ background: "var(--color-app-border)" }}
                >
                  {isActive && !reducedMotion && (
                    <span
                      key={activeIndex}
                      onAnimationEnd={advance}
                      className="carousel-progress-fill absolute inset-y-0 left-0 block bg-accent"
                      style={{
                        animationDuration: `${SLIDE_DURATION_MS}ms`,
                        animationPlayState: paused ? "paused" : "running",
                      }}
                    />
                  )}
                  {isActive && reducedMotion && <span className="absolute inset-y-0 left-0 block w-full bg-accent" />}
                </span>
              </button>
            );
          })}

          {!reducedMotion && (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? "Play slideshow" : "Pause slideshow"}
              className="flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              style={{ borderColor: "var(--color-app-border)", color: "var(--color-app-muted)" }}
            >
              {paused ? <PlayIcon /> : <PauseIcon />}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
