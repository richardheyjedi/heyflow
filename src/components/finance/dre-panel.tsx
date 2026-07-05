import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/taskflow/empty-state";
import { formatCurrencyBRL, type DRESummary } from "@/lib/finance/calculations";

export function DrePanel({ dre, monthLabel }: { dre: DRESummary; monthLabel: string }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="text-xs text-muted-foreground">Receitas ({monthLabel})</p>
          <p className="mt-1 text-xl font-semibold text-primary">{formatCurrencyBRL(dre.receitaTotalCents)}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="text-xs text-muted-foreground">Despesas ({monthLabel})</p>
          <p className="mt-1 text-xl font-semibold text-priority-urgent">{formatCurrencyBRL(dre.despesaTotalCents)}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="text-xs text-muted-foreground">Resultado</p>
          <p className={cn("mt-1 text-xl font-semibold", dre.resultadoCents >= 0 ? "text-foreground" : "text-priority-urgent")}>
            {formatCurrencyBRL(dre.resultadoCents)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 p-4">
        <p className="mb-3 text-sm font-semibold text-foreground">Despesas por categoria</p>
        {dre.despesasPorCategoria.length === 0 ? (
          <EmptyState title="Sem despesas no mês" className="p-6" />
        ) : (
          <div className="space-y-2.5">
            {dre.despesasPorCategoria.map((entry) => {
              const percentage = dre.despesaTotalCents > 0 ? (entry.totalCents / dre.despesaTotalCents) * 100 : 0;
              return (
                <div key={entry.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{entry.category}</span>
                    <span className="text-muted-foreground">{formatCurrencyBRL(entry.totalCents)}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-gradient-violet" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
