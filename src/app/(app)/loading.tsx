// Feedback instantâneo ao navegar entre páginas do app (todas são
// force-dynamic): um esqueleto neutro aparece na hora enquanto o servidor
// monta a página de destino, em vez de a tela anterior "congelar".
export default function AppLoading() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6" aria-busy="true" aria-label="Carregando...">
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded-lg bg-muted/50" />
        <div className="h-4 w-72 animate-pulse rounded-lg bg-muted/30" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl border border-border/40 bg-card/40" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl border border-border/40 bg-card/40" />
      <div className="h-40 animate-pulse rounded-2xl border border-border/40 bg-card/30" />
    </div>
  );
}
