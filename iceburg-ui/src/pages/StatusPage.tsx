interface StatusPageProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function StatusPage({ eyebrow, title, description }: StatusPageProps) {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-start px-4 py-24 sm:px-6">
      <span className="rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent">{eyebrow}</span>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-3 text-black/60 dark:text-white/60">{description}</p>
    </main>
  );
}
