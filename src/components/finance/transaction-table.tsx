"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BellRing,
  Check,
  MoreHorizontal,
  Repeat,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/taskflow/empty-state";
import { CategoryBadge } from "@/components/finance/category-badge";
import {
  deleteFinanceTransaction,
  duplicateFinanceTransaction,
  updateFinanceTransactionCategory,
  updateFinanceTransactionStatus,
} from "@/lib/finance/actions";
import { formatCurrencyBRL, getClientName, isTransactionOverdue } from "@/lib/finance/calculations";
import { cn } from "@/lib/utils";
import type { Category, Client, Transaction, TransactionStatus } from "@/lib/finance/types";

const STATUS_LABEL: Record<TransactionStatus, string> = {
  pago: "Pago",
  nao_pago: "Não pago",
  pendente: "Pendente",
};

const STATUS_TRIGGER_STYLES: Record<TransactionStatus, string> = {
  pago: "text-primary",
  nao_pago: "text-priority-urgent",
  pendente: "text-priority-medium",
};

type SortField = "description" | "category" | "dueDate" | "amountCents" | "status";
type SortDirection = "asc" | "desc";

const COLUMNS: { field: SortField; label: string; className?: string }[] = [
  { field: "description", label: "Descrição" },
  { field: "category", label: "Categoria" },
  { field: "dueDate", label: "Vencimento" },
  { field: "amountCents", label: "Valor", className: "text-right" },
  { field: "status", label: "Status" },
];

export function TransactionTable({
  transactions,
  clients,
  categories,
  selectedIds,
  onToggleRow,
  onToggleAll,
  onEdit,
  onScheduleCharge,
}: {
  transactions: Transaction[];
  clients: Client[];
  categories: Category[];
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
  onToggleAll: () => void;
  onEdit: (transaction: Transaction) => void;
  onScheduleCharge: (transaction: Transaction) => void;
}) {
  const [, startTransition] = useTransition();
  const [sortField, setSortField] = useState<SortField>("dueDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const groupByCategoryName = useMemo(() => new Map(categories.map((c) => [c.name, c.group])), [categories]);
  const categoryItems: Record<string, string> = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.name, c.name])),
    [categories]
  );

  const sorted = useMemo(() => {
    const factor = sortDirection === "asc" ? 1 : -1;
    return [...transactions].sort((a, b) => {
      if (sortField === "amountCents") return (a.amountCents - b.amountCents) * factor;
      return a[sortField].localeCompare(b[sortField]) * factor;
    });
  }, [transactions, sortField, sortDirection]);

  function toggleSort(field: SortField) {
    if (field === sortField) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  function handleStatusChange(id: string, status: TransactionStatus) {
    startTransition(async () => {
      await updateFinanceTransactionStatus(id, status);
    });
  }

  function handleCategoryChange(id: string, category: string) {
    startTransition(async () => {
      await updateFinanceTransactionCategory(id, category);
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
    <div className="overflow-x-auto rounded-xl border border-border/70">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr className="bg-card/80">
            <th className="w-10 border-b border-border/70 px-3 py-2.5">
              <Checkbox
                checked={transactions.length > 0 && selectedIds.size === transactions.length}
                onCheckedChange={onToggleAll}
                aria-label="Selecionar todos"
              />
            </th>
            {COLUMNS.map((col) => (
              <th
                key={col.field}
                onClick={() => toggleSort(col.field)}
                className={cn(
                  "cursor-pointer select-none whitespace-nowrap border-b border-border/70 px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground",
                  col.className
                )}
              >
                <span className={cn("inline-flex items-center gap-1", col.className === "text-right" && "justify-end")}>
                  {col.label}
                  {sortField === col.field ? (
                    sortDirection === "asc" ? (
                      <ArrowUp className="size-3" />
                    ) : (
                      <ArrowDown className="size-3" />
                    )
                  ) : (
                    <ArrowUpDown className="size-3 opacity-30" />
                  )}
                </span>
              </th>
            ))}
            <th className="whitespace-nowrap border-b border-border/70 px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">
              Cliente
            </th>
            <th className="w-10 border-b border-border/70 px-2 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((transaction) => {
            const clientName = getClientName(clients, transaction.clientId);
            const group = groupByCategoryName.get(transaction.category) ?? "outro";
            const overdue = isTransactionOverdue(transaction);

            return (
              <tr
                key={transaction.id}
                className={cn(
                  "group transition-colors hover:bg-accent/30",
                  selectedIds.has(transaction.id) && "bg-primary/5",
                  overdue && !selectedIds.has(transaction.id) && "bg-priority-urgent/5"
                )}
              >
                <td className="border-b border-border/40 px-3 py-2">
                  <Checkbox
                    checked={selectedIds.has(transaction.id)}
                    onCheckedChange={() => onToggleRow(transaction.id)}
                    aria-label={`Selecionar ${transaction.description}`}
                  />
                </td>
                <td className="whitespace-nowrap border-b border-border/40 px-3 py-2">
                  <button
                    onClick={() => onEdit(transaction)}
                    className="max-w-56 truncate text-left font-medium text-foreground hover:underline"
                    title={transaction.description}
                  >
                    {transaction.kind === "despesa" ? "− " : "+ "}
                    {transaction.description}
                  </button>
                  <span className="ml-1 inline-flex items-center gap-1 align-middle text-muted-foreground">
                    {transaction.recurrence && <Repeat className="size-3" />}
                    {transaction.reminderId && <BellRing className="size-3 text-primary" />}
                  </span>
                </td>
                <td className="border-b border-border/40 px-3 py-2">
                  <Select
                    items={categoryItems}
                    value={transaction.category}
                    onValueChange={(v) => v && handleCategoryChange(transaction.id, v)}
                  >
                    <SelectTrigger className="h-auto w-auto gap-1 border-none bg-transparent p-0 shadow-none hover:opacity-80 focus-visible:ring-0">
                      <SelectValue>
                        <CategoryBadge name={transaction.category} group={group} />
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.name}>
                          <CategoryBadge name={c.name} group={c.group} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="whitespace-nowrap border-b border-border/40 px-3 py-2 text-muted-foreground">
                  <div className={cn("flex items-center gap-1", overdue && "font-medium text-priority-urgent")}>
                    {overdue && <AlertTriangle className="size-3" />}
                    {format(parseISO(transaction.dueDate), "dd MMM", { locale: ptBR })}
                  </div>
                  {transaction.paidAt && (
                    <div className="text-[11px]">Pago {format(parseISO(transaction.paidAt), "dd MMM", { locale: ptBR })}</div>
                  )}
                  {overdue && <div className="text-[11px] text-priority-urgent">Atrasado</div>}
                </td>
                <td
                  className={cn(
                    "whitespace-nowrap border-b border-border/40 px-3 py-2 text-right font-semibold",
                    transaction.kind === "receita" ? "text-primary" : "text-foreground"
                  )}
                >
                  {formatCurrencyBRL(transaction.amountCents)}
                </td>
                <td className="whitespace-nowrap border-b border-border/40 px-3 py-2">
                  <Select
                    value={transaction.status}
                    onValueChange={(v) => v && handleStatusChange(transaction.id, v as TransactionStatus)}
                  >
                    <SelectTrigger
                      className={cn(
                        "h-auto w-auto gap-1 border-none bg-transparent p-0 text-xs font-medium shadow-none hover:opacity-80 focus-visible:ring-0",
                        STATUS_TRIGGER_STYLES[transaction.status]
                      )}
                    >
                      <SelectValue>
                        <span className="inline-flex items-center gap-1">
                          {transaction.status === "pago" && <Check className="size-3" />}
                          {STATUS_LABEL[transaction.status]}
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_LABEL) as TransactionStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="whitespace-nowrap border-b border-border/40 px-3 py-2 text-muted-foreground">
                  <span className="mr-1.5 rounded-full bg-muted/50 px-1.5 py-0.5 text-[10px]">{transaction.scope}</span>
                  {clientName ?? "—"}
                </td>
                <td className="border-b border-border/40 px-2 py-2 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<button className="flex size-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100" />}>
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
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
