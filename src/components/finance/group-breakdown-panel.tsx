import { AlertTriangle } from "lucide-react";
import { CategoryGroupBadge } from "@/components/finance/category-badge";
import { EmptyState } from "@/components/taskflow/empty-state";
import { cn } from "@/lib/utils";
import { formatCurrencyBRL, type BudgetStatus } from "@/lib/finance/calculations";

export function GroupBreakdownPanel({ status }: { status: BudgetStatus[] }) {
  if (status.length === 0) {
    return <EmptyState title="Sem despesas no mês" description="Configure um orçamento para acompanhar seus gastos." className="p-6" />;
  }

  const totalSpent = status.reduce((sum, entry) => sum + entry.spentCents, 0);

  return (
    <div className="space-y-3">
      {status.map((entry) => {
        const hasLimit = entry.limitCents !== null;
        const barWidth = hasLimit
          ? Math.min(100, entry.percentage ?? 0)
          : totalSpent > 0
            ? (entry.spentCents / totalSpent) * 100
            : 0;

        return (
          <div key={entry.group} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <CategoryGroupBadge group={entry.group} />
                {entry.isOverBudget && <AlertTriangle className="size-3 text-priority-urgent" />}
              </span>
              <span className={cn("font-medium", entry.isOverBudget ? "text-priority-urgent" : "text-foreground")}>
                {formatCurrencyBRL(entry.spentCents)}
                {hasLimit && (
                  <span className="text-muted-foreground"> / {formatCurrencyBRL(entry.limitCents!)}</span>
                )}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  entry.isOverBudget
                    ? "bg-priority-urgent"
                    : hasLimit && (entry.percentage ?? 0) >= 90
                      ? "bg-priority-medium"
                      : "bg-gradient-violet"
                )}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
