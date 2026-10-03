import { Faq } from "../features/marketing/components/Faq";

export function FaqPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-28">
      <span className="inline-flex rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">FAQ</span>
      <h1
        className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl"
        style={{ color: "var(--color-app-text)" }}
      >
        Frequently asked questions
      </h1>
      <p className="mt-4 text-base leading-relaxed" style={{ color: "var(--color-app-muted)" }}>
        Short answers about how offerings are priced, settled, and verified. For more detail, see the{" "}
        <a
          href="https://iohaus.gitbook.io/iceburg"
          target="_blank"
          rel="noreferrer"
          className="text-accent underline underline-offset-4"
        >
          documentation
        </a>
        .
      </p>
      <div className="mt-10">
        <Faq />
      </div>
    </main>
  );
}
