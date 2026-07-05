"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, MoreHorizontal, Repeat, BellRing, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/taskflow/empty-state";
import { TransactionStatusBadge } from "@/components/finance/transaction-status-badge";
import {
  deleteFinanceTransaction,
  duplicateFinanceTransaction,
  markFinanceTransactionPaid,
  markFinanceTransactionUnpaid,
} from "@/lib/finance/actions";
import { formatCurrencyBRL, getClientName } from "@/lib/finance/calculations";
import { cn } from "@/lib/utils";
import type { Client, Transaction } from "@/lib/finance/types";

export function TransactionList({
  transactions,
  clients,
  onEdit,
  onScheduleCharge,
}: {
  transactions: Transaction[];
  clients: Client[];
  onEdit: (transaction: Transaction) => void;
  onScheduleCharge: (transaction: Transaction) => void;
}) {
  const [, startTransition] = useTransition();

  function handleTogglePaid(transaction: Transaction) {
    startTransition(async () => {
      if (transaction.status === "pago") {
        await markFinanceTransactionUnpaid(transaction.id);
      } else {
        await markFinanceTransactionPaid(transaction.id);
      }
    });
  }

  function handleDuplicate(id: string) {
    startTransition(async () => {
      await duplicateFinanceTransaction(id);
      toast.success("Lançamento duplicado.");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteFinanceTransaction(id);
      toast.success("Lançamento excluído.");
    });
  }

  if (transactions.length === 0) {
    return <EmptyState title="Nenhum lançamento encontrado" description="Ajuste os filtros ou crie um novo lançamento." />;
  }

  return (
    <div className="space-y-2">
      {transactions.map((transaction) => {
        const isPaid = transaction.status === "pago";
        const clientName = getClientName(clients, transaction.clientId);

        return (
          <div
            key={transaction.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-card/60 p-3.5 transition-colors duration-150 hover:border-primary/30"
          >
            <button
              onClick={() => handleTogglePaid(transaction)}
              title={isPaid ? "Marcar como não pago" : "Marcar como pago"}
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
                isPaid ? "border-primary bg-gradient-violet" : "border-muted-foreground/40 hover:border-primary"
              )}
            >
              {isPaid && <Check className="size-3.5 text-white" strokeWidth={3} />}
            </button>

            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full",
                transaction.kind === "receita" ? "bg-primary/15 text-primary" : "bg-priority-high/15 text-priority-high"
              )}
            >
              {transaction.kind === "receita" ? <ArrowUpCircle className="size-4" /> : <ArrowDownCircle className="size-4" />}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{transaction.description}</p>
              <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="rounded-full bg-muted/50 px-1.5 py-0.5">{transaction.scope}</span>
                <span>{transaction.category}</span>
                {clientName && <span>· {clientName}</span>}
                {transaction.recurrence && (
                  <span className="inline-flex items-center gap-0.5">
                    <Repeat className="size-3" /> recorrente
                  </span>
                )}
                {transaction.reminderId && (
                  <span className="inline-flex items-center gap-0.5 text-primary">
                    <BellRing className="size-3" /> cobrança agendada
                  </span>
                )}
              </p>
            </div>

            <div className="text-right text-xs text-muted-foreground">
              <p>Vence {format(parseISO(transaction.dueDate), "dd MMM", { locale: ptBR })}</p>
              {transaction.paidAt && <p>Pago {format(parseISO(transaction.paidAt), "dd MMM", { locale: ptBR })}</p>}
            </div>

            <p
              className={cn(
                "w-28 shrink-0 text-right text-sm font-semibold",
                transaction.kind === "receita" ? "text-primary" : "text-foreground"
              )}
            >
              {transaction.kind === "despesa" ? "− " : "+ "}
              {formatCurrencyBRL(transaction.amountCents)}
            </p>

            <TransactionStatusBadge status={transaction.status} />

            <DropdownMenu>
              <DropdownMenuTrigger render={<button className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" />}>
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(transaction)}>Editar</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDuplicate(transaction.id)}>Duplicar</DropdownMenuItem>
                {transaction.kind === "receita" && (
                  <DropdownMenuItem onClick={() => onScheduleCharge(transaction)}>Programar cobrança</DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => handleDelete(transaction.id)}
                  className="text-priority-urgent focus:text-priority-urgent"
                >
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      })}
    </div>
  );
}
