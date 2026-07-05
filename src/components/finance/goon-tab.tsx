"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowUpCircle, CheckCircle2, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/taskflow/dashboard/metric-card";
import { CashFlowChart } from "@/components/finance/cash-flow-chart";
import { TransactionFiltersBar } from "@/components/finance/transaction-filters-bar";
import { TransactionTable } from "@/components/finance/transaction-table";
import { TransactionFormModal } from "@/components/finance/transaction-form-modal";
import { ScheduleChargeDialog } from "@/components/finance/schedule-charge-dialog";
import { BulkActionsBar } from "@/components/finance/bulk-actions-bar";
import {
  deleteManyFinanceTransactions,
  markManyFinanceTransactionsPaid,
  markManyFinanceTransactionsUnpaid,
} from "@/lib/finance/actions";
import {
  filterTransactions,
  formatCurrencyBRL,
  getCashFlowSeries,
  getTotals,
  isTransactionOverdue,
} from "@/lib/finance/calculations";
import { DEFAULT_FILTERS, type Category, type Client, type Transaction, type TransactionFilters } from "@/lib/finance/types";

/**
 * Aba GOON — recorte "só recebimentos": mostra apenas lançamentos de receita,
 * separado do financeiro geral (que mistura PF/PJ, casa e despesas). Reaproveita
 * os mesmos componentes/Server Actions de Lançamentos, só filtrando por kind.
 */
export function GoonTab({
  transactions,
  clients,
  categories,
}: {
  transactions: Transaction[];
  clients: Client[];
  categories: Category[];
}) {
  const receitas = useMemo(() => transactions.filter((t) => t.kind === "receita"), [transactions]);

  const [filters, setFilters] = useState<TransactionFilters>({ ...DEFAULT_FILTERS, period: "next_30_days" });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [chargeTarget, setChargeTarget] = useState<Transaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkPending, startBulkTransition] = useTransition();

  const filtered = useMemo(
    () => filterTransactions(receitas, filters, new Date(), categories),
    [receitas, filters, categories]
  );

  const totals = useMemo(() => getTotals(receitas), [receitas]);
  const overdueCents = useMemo(
    () => receitas.filter((t) => isTransactionOverdue(t)).reduce((s, t) => s + t.amountCents, 0),
    [receitas]
  );
  const cashFlowSeries = useMemo(() => getCashFlowSeries(receitas, 5), [receitas]);

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
      toast.success(`${ids.length} recebimento(s) marcado(s) como pago.`);
      setSelectedIds(new Set());
    });
  }

  function handleBulkMarkUnpaid() {
    const ids = Array.from(visibleSelectedIds);
    startBulkTransition(async () => {
      await markManyFinanceTransactionsUnpaid(ids);
      toast.success(`${ids.length} recebimento(s) marcado(s) como não pago.`);
      setSelectedIds(new Set());
    });
  }

  function handleBulkDelete() {
    const ids = Array.from(visibleSelectedIds);
    startBulkTransition(async () => {
      await deleteManyFinanceTransactions(ids);
      toast.success(`${ids.length} recebimento(s) excluído(s).`);
      setSelectedIds(new Set());
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Recebido" value={formatCurrencyBRL(totals.totalReceivedCents)} icon={CheckCircle2} accent="violet" />
        <MetricCard label="A receber" value={formatCurrencyBRL(totals.totalReceivableCents)} icon={ArrowUpCircle} accent="violet" />
        <MetricCard label="Atrasado" value={formatCurrencyBRL(overdueCents)} icon={Clock} accent="rose" />
      </div>

      <div className="rounded-2xl border border-border/70 bg-card/60 p-5">
        <h2 className="text-sm font-semibold text-foreground">Recebimentos por mês</h2>
        <p className="mb-2 text-xs text-muted-foreground">Só entradas — sem misturar com despesas.</p>
        <CashFlowChart data={cashFlowSeries} />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TransactionFiltersBar filters={filters} onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))} clients={clients} />
          <Button size="sm" className="bg-gradient-violet glow-violet-sm text-white" onClick={openCreate}>
            <Plus className="size-3.5" />
            Novo recebimento
          </Button>
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
      </div>

      <TransactionFormModal
        isOpen={isFormOpen}
        editing={editingTransaction}
        clients={clients}
        categories={categories}
        defaults={{ kind: "receita", scope: "PJ" }}
        onClose={() => setIsFormOpen(false)}
      />
      <ScheduleChargeDialog transaction={chargeTarget} clients={clients} onClose={() => setChargeTarget(null)} />
    </div>
  );
}
