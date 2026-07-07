"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowDownCircle, ArrowUpCircle, CheckCircle2, Clock, Plus } from "lucide-react";
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
import { parseISO } from "date-fns";
import {
  filterTransactions,
  formatCurrencyBRL,
  getCashFlowSeries,
  getTotals,
  isTransactionOverdue,
} from "@/lib/finance/calculations";
import {
  DEFAULT_FILTERS,
  type Category,
  type Client,
  type Transaction,
  type TransactionFilters,
  type TransactionKind,
} from "@/lib/finance/types";

const KIND_COPY = {
  receita: {
    itemLabel: "recebimento",
    newButtonLabel: "Novo recebimento",
    chartTitle: "Recebimentos por mês",
    chartSubtitle: "Só entradas — sem misturar com despesas.",
    firstKpi: { label: "Recebido", icon: CheckCircle2 },
    secondKpi: { label: "A receber", icon: ArrowUpCircle },
  },
  despesa: {
    itemLabel: "despesa",
    newButtonLabel: "Nova despesa",
    chartTitle: "Despesas por mês",
    chartSubtitle: "Só saídas — sem misturar com receitas.",
    firstKpi: { label: "Pago", icon: CheckCircle2 },
    secondKpi: { label: "A pagar", icon: ArrowDownCircle },
  },
} satisfies Record<TransactionKind, unknown>;

/**
 * Recorte "só recebimentos" ou "só despesas" — reaproveita os mesmos
 * componentes/Server Actions de Lançamentos, filtrando por `kind`, para não
 * misturar entradas e saídas na mesma tabela.
 */
export function TransactionKindTab({
  kind,
  transactions,
  clients,
  categories,
  todayISO,
}: {
  kind: TransactionKind;
  transactions: Transaction[];
  clients: Client[];
  categories: Category[];
  /** Dia de referência vindo do servidor — mantém SSR e cliente idênticos. */
  todayISO: string;
}) {
  const copy = KIND_COPY[kind];
  const referenceDate = useMemo(() => parseISO(todayISO), [todayISO]);
  const scoped = useMemo(() => transactions.filter((t) => t.kind === kind), [transactions, kind]);

  // DEFAULT_FILTERS usa período "Mês atual" — um período fixo pra frente (ex.:
  // "próximos 30 dias") escondia, por padrão, qualquer item já vencido (mesmo
  // dentro do mês corrente), mesmo aparecendo no painel "Vence em 7 dias" da
  // Visão Geral.
  const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_FILTERS);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [chargeTarget, setChargeTarget] = useState<Transaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkPending, startBulkTransition] = useTransition();

  const filtered = useMemo(
    () => filterTransactions(scoped, filters, referenceDate, categories),
    [scoped, filters, referenceDate, categories]
  );

  const totals = useMemo(() => getTotals(scoped), [scoped]);
  const firstKpiCents = kind === "receita" ? totals.totalReceivedCents : totals.totalPaidCents;
  const secondKpiCents = kind === "receita" ? totals.totalReceivableCents : totals.totalPayableCents;
  const overdueCents = useMemo(
    () => scoped.filter((t) => isTransactionOverdue(t, referenceDate)).reduce((s, t) => s + t.amountCents, 0),
    [scoped, referenceDate]
  );
  const cashFlowSeries = useMemo(() => getCashFlowSeries(scoped, 5, referenceDate), [scoped, referenceDate]);

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
      toast.success(`${ids.length} ${copy.itemLabel}(s) marcado(s) como pago.`);
      setSelectedIds(new Set());
    });
  }

  function handleBulkMarkUnpaid() {
    const ids = Array.from(visibleSelectedIds);
    startBulkTransition(async () => {
      await markManyFinanceTransactionsUnpaid(ids);
      toast.success(`${ids.length} ${copy.itemLabel}(s) marcado(s) como não pago.`);
      setSelectedIds(new Set());
    });
  }

  function handleBulkDelete() {
    const ids = Array.from(visibleSelectedIds);
    startBulkTransition(async () => {
      await deleteManyFinanceTransactions(ids);
      toast.success(`${ids.length} ${copy.itemLabel}(s) excluído(s).`);
      setSelectedIds(new Set());
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label={copy.firstKpi.label} value={formatCurrencyBRL(firstKpiCents)} icon={copy.firstKpi.icon} accent="violet" />
        <MetricCard label={copy.secondKpi.label} value={formatCurrencyBRL(secondKpiCents)} icon={copy.secondKpi.icon} accent="violet" />
        <button
          type="button"
          onClick={() => setFilters((prev) => ({ ...prev, status: "atrasado" }))}
          className="text-left transition-transform hover:scale-[1.01]"
          title="Ver todos os atrasados, independente do período"
        >
          <MetricCard label="Atrasado" value={formatCurrencyBRL(overdueCents)} icon={Clock} accent="rose" />
        </button>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card/60 p-5">
        <h2 className="text-sm font-semibold text-foreground">{copy.chartTitle}</h2>
        <p className="mb-2 text-xs text-muted-foreground">{copy.chartSubtitle}</p>
        <CashFlowChart data={cashFlowSeries} />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TransactionFiltersBar filters={filters} onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))} clients={clients} />
          <Button size="sm" className="bg-gradient-violet glow-violet-sm text-white" onClick={openCreate}>
            <Plus className="size-3.5" />
            {copy.newButtonLabel}
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
          referenceDate={referenceDate}
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
        defaults={{ kind, scope: "PJ", isGoon: false }}
        onClose={() => setIsFormOpen(false)}
      />
      <ScheduleChargeDialog transaction={chargeTarget} clients={clients} onClose={() => setChargeTarget(null)} />
    </div>
  );
}
