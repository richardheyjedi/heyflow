"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionFiltersBar } from "@/components/finance/transaction-filters-bar";
import { TransactionList } from "@/components/finance/transaction-list";
import { TransactionFormModal } from "@/components/finance/transaction-form-modal";
import { ScheduleChargeDialog } from "@/components/finance/schedule-charge-dialog";
import { ExportCsvButton } from "@/components/finance/export-csv-button";
import { filterTransactions } from "@/lib/finance/calculations";
import { DEFAULT_FILTERS, type Client, type Transaction } from "@/lib/finance/types";

export function TransactionsTab({
  transactions,
  clients,
  categories,
}: {
  transactions: Transaction[];
  clients: Client[];
  categories: string[];
}) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [chargeTarget, setChargeTarget] = useState<Transaction | null>(null);

  const filtered = useMemo(() => filterTransactions(transactions, filters), [transactions, filters]);

  function openCreate() {
    setEditingTransaction(null);
    setIsFormOpen(true);
  }

  function openEdit(transaction: Transaction) {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TransactionFiltersBar filters={filters} onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))} clients={clients} />
        <div className="flex items-center gap-2">
          <ExportCsvButton transactions={filtered} clients={clients} />
          <Button size="sm" className="bg-gradient-violet glow-violet-sm text-white" onClick={openCreate}>
            <Plus className="size-3.5" />
            Novo lançamento
          </Button>
        </div>
      </div>

      <TransactionList transactions={filtered} clients={clients} onEdit={openEdit} onScheduleCharge={setChargeTarget} />

      <TransactionFormModal
        isOpen={isFormOpen}
        editing={editingTransaction}
        clients={clients}
        categories={categories}
        onClose={() => setIsFormOpen(false)}
      />
      <ScheduleChargeDialog transaction={chargeTarget} clients={clients} onClose={() => setChargeTarget(null)} />
    </div>
  );
}
