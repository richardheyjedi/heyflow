import { CheckCircle2, AlertTriangle } from "lucide-react";
import { formatCurrencyBRL } from "@/lib/finance/calculations";
import { cn } from "@/lib/utils";
import type { MonthSettledStatus } from "@/lib/finance/calculations";

export function MonthSettledBanner({ status }: { status: MonthSettledStatus }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border p-4",
        status.settled ? "border-primary/30 bg-primary/10" : "border-priority-urgent/25 bg-priority-urgent/10"
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          status.settled ? "bg-primary/15 text-primary" : "bg-priority-urgent/15 text-priority-urgent"
        )}
      >
        {status.settled ? <CheckCircle2 className="size-5" /> : <AlertTriangle className="size-5" />}
      </span>
      <p className="text-sm font-medium text-foreground">
        {status.settled
          ? "Mês quitado — todas as contas em dia."
          : `Faltam ${formatCurrencyBRL(status.remainingCents)} em ${status.remainingCount} conta${status.remainingCount === 1 ? "" : "s"}.`}
      </p>
    </div>
  );
}
