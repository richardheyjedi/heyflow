import { cn } from "@/lib/utils";
import { formatCurrencyBRL, type MonthProjection } from "@/lib/finance/calculations";

export function BalanceProjectionPanel({ projection }: { projection: MonthProjection[] }) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
      {projection.map((month) => (
        <div key={month.monthKey} className="rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 capitalize">
            {month.label}
          </p>
          <p
            className={cn(
              "mt-1.5 text-xl font-semibold",
              month.saldoCents >= 0 ? "text-primary" : "text-priority-urgent"
            )}
          >
            {formatCurrencyBRL(month.saldoCents)}
          </p>
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            <span>+ {formatCurrencyBRL(month.receitasCents)}</span>
            <span>− {formatCurrencyBRL(month.despesasCents)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
