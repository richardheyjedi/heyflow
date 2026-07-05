import { formatCurrencyBRL, type PaymentCutoff } from "@/lib/finance/calculations";
import { cn } from "@/lib/utils";

export function PaymentCutoffsPanel({ cutoffs }: { cutoffs: PaymentCutoff[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
      {cutoffs.map((cutoff) => (
        <div
          key={cutoff.day}
          className={cn(
            "rounded-xl border p-3.5 transition-colors duration-150",
            cutoff.totalCents > 0 ? "border-priority-medium/25 bg-priority-medium/10" : "border-border/60 bg-card/40"
          )}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{cutoff.label}</p>
          <p className="mt-1.5 text-lg font-semibold text-foreground">{formatCurrencyBRL(cutoff.totalCents)}</p>
          <p className="text-[11px] text-muted-foreground">
            {cutoff.count === 0 ? "Nada pendente" : `${cutoff.count} conta${cutoff.count === 1 ? "" : "s"}`}
          </p>
        </div>
      ))}
    </div>
  );
}
