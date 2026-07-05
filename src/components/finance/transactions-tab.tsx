"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionFiltersBar } from "@/components/finance/transaction-filters-bar";
import { TransactionTable } from "@/components/finance/transaction-table";
import { TransactionFormModal, type TransactionDefaults } from "@/components/finance/transaction-form-modal";
import { ScheduleChargeDialog } from "@/components/finance/schedule-charge-dialog";
import { CategoryManagerDialog } from "@/components/finance/category-manager-dialog";
import { ExportCsvButton } from "@/components/finance/export-csv-button";
import { BulkActionsBar } from "@/components/finance/bulk-actions-bar";
import {
  deleteManyFinanceTransactions,
  markManyFinanceTransactionsPaid,
  markManyFinanceTransactionsUnpaid,
} from "@/lib/finance/actions";
import { filterTransactions, formatCurrencyBRL, isTransactionOverdue } from "@/lib/finance/calculations";
import { DEFAULT_FILTERS, type Category, type Client, type Transaction } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

export function TransactionsTab({
  transactions,
  clients,
  categories,
  defaults,
}: {
  transactions: Transaction[];
  clients: Client[];
  categories: Category[];
  defaults?: TransactionDefaults;
}) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [chargeTarget, setChargeTarget] = useState<Transaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkPending, startBulkTransition] = useTransition();

  const filtered = useMemo(
    () => filterTransactions(transactions, filters, new Date(), categories),
    [transactions, filters, categories]
  );

  // O chip "Atrasado" precisa ignorar o período (mesma lógica do filtro
  // "atrasado") — senão uma conta vencida em outro mês nunca apareceria aqui,
  // que era exatamente o problema original.
  const overdueTransactions = useMemo(
    () => filterTransactions(transactions, { ...filters, status: "atrasado" }, new Date(), categories),
    [transactions, filters, categories]
  );

  const summary = useMemo(() => {
    const paid = filtered.filter((t) => t.status === "pago");
    const open = filtered.filter((t) => t.status !== "pago" && !isTransactionOverdue(t));
    const sum = (items: Transaction[]) => items.reduce((s, t) => s + t.amountCents, 0);
    return {
      count: filtered.length,
      totalCents: sum(filtered),
      paidCount: paid.length,
      paidCents: sum(paid),
      openCount: open.length,
      openCents: sum(open),
      overdueCount: overdueTransactions.length,
      overdueCents: sum(overdueTransactions),
    };
  }, [filtered, overdueTransactions]);

  // Só considera selecionados os lançamentos que ainda estão visíveis com os
  // filtros atuais (evita agir sobre linhas escondidas por um filtro novo).
  const visibleSelectedIds = useMemo(() => {
    const filteredIds = new Set(filtered.map((t) => t.id));
    return new Set(Array.from(selectedIds).filter((id) => filteredIds.has(id)));
  }, [filtered, selectedIds]);

  function openCreate() {
    setEditingTransaction(null);
    setIsFormOpen(true);
  }

  function openEdit(transaction: Transaction) {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds(visibleSelectedIds.size === filtered.length ? new Set() : new Set(filtered.map((t) => t.id)));
  }

  function handleBulkMarkPaid() {
    const ids = Array.from(visibleSelectedIds);
    startBulkTransition(async () => {
      await markManyFinanceTransactionsPaid(ids);
      toast.success(`${ids.length} lançamento(s) marcado(s) como pago.`);
      setSelectedIds(new Set());
    });
  }

  function handleBulkMarkUnpaid() {
    const ids = Array.from(visibleSelectedIds);
    startBulkTransition(async () => {
      await markManyFinanceTransactionsUnpaid(ids);
      toast.success(`${ids.length} lançamento(s) marcado(s) como não pago.`);
      setSelectedIds(new Set());
    });
  }

  function handleBulkDelete() {
    const ids = Array.from(visibleSelectedIds);
    startBulkTransition(async () => {
      await deleteManyFinanceTransactions(ids);
      toast.success(`${ids.length} lançamento(s) excluído(s).`);
      setSelectedIds(new Set());
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TransactionFiltersBar filters={filters} onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))} clients={clients} />
        <div className="flex items-center gap-2">
          <CategoryManagerDialog
            categories={categories}
            trigger={
              <Button variant="outline" size="sm">
                <Tags className="size-3.5" />
                Categorias
              </Button>
            }
          />
          <ExportCsvButton transactions={filtered} clients={clients} />
          <Button size="sm" className="bg-gradient-violet glow-violet-sm text-white" onClick={openCreate}>
            <Plus className="size-3.5" />
            Novo lançamento
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <SummaryChip label="Total" count={summary.count} amountCents={summary.totalCents} />
        <SummaryChip label="Pago" count={summary.paidCount} amountCents={summary.paidCents} tone="primary" />
        <SummaryChip label="Em aberto" count={summary.openCount} amountCents={summary.openCents} tone="amber" />
        <SummaryChip
          label="Atrasado"
          count={summary.overdueCount}
          amountCents={summary.overdueCents}
          tone="urgent"
          onClick={summary.overdueCount > 0 ? () => setFilters((prev) => ({ ...prev, status: "atrasado" })) : undefined}
        />
      </div>

      <BulkActionsBar
        count={visibleSelectedIds.size}
        isPending={isBulkPending}
        onMarkPaid={handleBulkMarkPaid}
        onMarkUnpaid={handleBulkMarkUnpaid}
        onDelete={handleBulkDelete}
        onClear={() => setSelectedIds(new Set())}
      />

      <TransactionTable
        transactions={filtered}
        clients={clients}
        categories={categories}
        selectedIds={visibleSelectedIds}
        onToggleRow={toggleRow}
        onToggleAll={toggleAll}
        onEdit={openEdit}
        onScheduleCharge={setChargeTarget}
      />

      <TransactionFormModal
        isOpen={isFormOpen}
        editing={editingTransaction}
        clients={clients}
        categories={categories}
        defaults={defaults}
        onClose={() => setIsFormOpen(false)}
      />
      <ScheduleChargeDialog transaction={chargeTarget} clients={clients} onClose={() => setChargeTarget(null)} />
    </div>
  );
}

function SummaryChip({
  label,
  count,
  amountCents,
  tone = "default",
  onClick,
}: {
  label: string;
  count: number;
  amountCents: number;
  tone?: "default" | "primary" | "amber" | "urgent";
  onClick?: () => void;
}) {
  const toneStyles = {
    default: "border-border/70 bg-card/60 text-foreground",
    primary: "border-primary/30 bg-primary/10 text-primary",
    amber: "border-priority-medium/30 bg-priority-medium/10 text-priority-medium",
    urgent: "border-priority-urgent/30 bg-priority-urgent/10 text-priority-urgent",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-medium disabled:cursor-default",
        toneStyles,
        onClick && "cursor-pointer transition-opacity hover:opacity-80"
      )}
    >
      <span>{label}</span>
      <span className="opacity-70">
        {count} · {formatCurrencyBRL(amountCents)}
      </span>
    </button>
  );
}
