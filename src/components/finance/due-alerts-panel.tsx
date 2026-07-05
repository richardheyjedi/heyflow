import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/taskflow/empty-state";
import { formatCurrencyBRL, getClientName, type DueAlert } from "@/lib/finance/calculations";
import type { Client } from "@/lib/finance/types";

export function DueAlertsPanel({ alerts, clients }: { alerts: DueAlert[]; clients: Client[] }) {
  if (alerts.length === 0) {
    return <EmptyState title="Nada vencendo" description="Nenhum lançamento vence nos próximos 7 dias." />;
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const clientName = getClientName(clients, alert.clientId);
        return (
          <div
            key={alert.id}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3",
              alert.isOverdue ? "border-priority-urgent/25 bg-priority-urgent/10" : "border-border/60 bg-card/40"
            )}
          >
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full",
                alert.kind === "receita" ? "bg-primary/15 text-primary" : "bg-priority-high/15 text-priority-high"
              )}
            >
              {alert.kind === "receita" ? <ArrowUpCircle className="size-4" /> : <ArrowDownCircle className="size-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{alert.description}</p>
              <p className="text-[11px] text-muted-foreground">
                {clientName ? `${clientName} · ` : ""}
                {format(parseISO(alert.dueDate), "dd MMM", { locale: ptBR })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">{formatCurrencyBRL(alert.amountCents)}</p>
              {alert.isOverdue && (
                <p className="inline-flex items-center gap-1 text-[11px] font-medium text-priority-urgent">
                  <AlertTriangle className="size-3" />
                  Atrasado
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
