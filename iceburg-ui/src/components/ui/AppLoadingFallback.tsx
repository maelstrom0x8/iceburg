export function AppLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--color-app-bg)" }}>
      <div className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  );
}
