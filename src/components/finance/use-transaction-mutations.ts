"use client";

// Mutações de lançamentos com UI otimista: a lista exibida reflete a mudança
// imediatamente (useOptimistic) enquanto a Server Action roda em segundo plano;
// quando o servidor revalida, as props novas substituem o estado otimista.
// Compartilhado por TransactionKindTab e TransactionsTab para não duplicar os
// handlers (individuais, em massa e desfazer) nos dois containers.

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  cancelFinanceReminder,
  deleteFinanceTransaction,
  deleteManyFinanceTransactions,
  duplicateFinanceTransaction,
  markManyFinanceTransactionsPaid,
  markManyFinanceTransactionsUnpaid,
  revertFinanceTransactionsStatus,
  updateFinanceTransactionCategory,
  updateFinanceTransactionStatus,
} from "@/lib/finance/actions";
import type { Transaction, TransactionStatus } from "@/lib/finance/types";

const STATUS_LABEL: Record<TransactionStatus, string> = {
  pago: "Pago",
  nao_pago: "Não pago",
  pendente: "Pendente",
};

type TransactionPatch =
  | { type: "update"; id: string; changes: Partial<Transaction> }
  | { type: "updateMany"; ids: string[]; changes: Partial<Transaction> }
  | { type: "updateEach"; entries: { id: string; changes: Partial<Transaction> }[] }
  | { type: "remove"; ids: string[] };

function applyPatch(state: Transaction[], patch: TransactionPatch): Transaction[] {
  switch (patch.type) {
    case "update":
      return state.map((t) => (t.id === patch.id ? { ...t, ...patch.changes } : t));
    case "updateMany": {
      const ids = new Set(patch.ids);
      return state.map((t) => (ids.has(t.id) ? { ...t, ...patch.changes } : t));
    }
    case "updateEach": {
      const byId = new Map(patch.entries.map((e) => [e.id, e.changes]));
      return state.map((t) => {
        const changes = byId.get(t.id);
        return changes ? { ...t, ...changes } : t;
      });
    }
    case "remove": {
      const ids = new Set(patch.ids);
      return state.filter((t) => !ids.has(t.id));
    }
  }
}

function statusChanges(status: TransactionStatus): Partial<Transaction> {
  return { status, paidAt: status === "pago" ? format(new Date(), "yyyy-MM-dd") : null };
}

export function useTransactionMutations(transactions: Transaction[], itemLabel = "lançamento") {
  const [optimisticTransactions, applyOptimistic] = useOptimistic(transactions, applyPatch);
  const [isPending, startTransition] = useTransition();

  function revert(snapshots: { id: string; previousStatus: TransactionStatus; previousPaidAt: string | null; followUpId: string | null }[]) {
    startTransition(async () => {
      applyOptimistic({
        type: "updateEach",
        entries: snapshots.map((s) => ({ id: s.id, changes: { status: s.previousStatus, paidAt: s.previousPaidAt } })),
      });
      try {
        await revertFinanceTransactionsStatus(snapshots);
        toast.success("Alteração desfeita.");
      } catch {
        toast.error("Não foi possível desfazer.");
      }
    });
  }

  function changeStatus(transaction: Transaction, status: TransactionStatus) {
    const { id, status: previousStatus, paidAt: previousPaidAt } = transaction;
    startTransition(async () => {
      applyOptimistic({ type: "update", id, changes: statusChanges(status) });
      try {
        const followUpId = await updateFinanceTransactionStatus(id, status);
        toast.success(`Status atualizado para "${STATUS_LABEL[status]}".`, {
          action: { label: "Desfazer", onClick: () => revert([{ id, previousStatus, previousPaidAt, followUpId }]) },
        });
      } catch {
        toast.error("Não foi possível atualizar o status.");
      }
    });
  }

  function changeCategory(id: string, category: string) {
    startTransition(async () => {
      applyOptimistic({ type: "update", id, changes: { category } });
      try {
        await updateFinanceTransactionCategory(id, category);
      } catch {
        toast.error("Não foi possível atualizar a categoria.");
      }
    });
  }

  function duplicate(id: string) {
    startTransition(async () => {
      try {
        await duplicateFinanceTransaction(id);
        toast.success("Lançamento duplicado.");
      } catch {
        toast.error("Não foi possível duplicar.");
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      applyOptimistic({ type: "remove", ids: [id] });
      try {
        await deleteFinanceTransaction(id);
        toast.success("Lançamento excluído.");
      } catch {
        toast.error("Não foi possível excluir.");
      }
    });
  }

  function markManyPaid(selected: Transaction[], onDone?: () => void) {
    const snapshots = selected.map((t) => ({ id: t.id, previousStatus: t.status, previousPaidAt: t.paidAt }));
    startTransition(async () => {
      applyOptimistic({ type: "updateMany", ids: selected.map((t) => t.id), changes: statusChanges("pago") });
      try {
        const followUps = await markManyFinanceTransactionsPaid(selected.map((t) => t.id));
        toast.success(`${selected.length} ${itemLabel}(s) marcado(s) como pago.`, {
          action: {
            label: "Desfazer",
            onClick: () => revert(snapshots.map((s) => ({ ...s, followUpId: followUps[s.id] ?? null }))),
          },
        });
        onDone?.();
      } catch {
        toast.error("Não foi possível marcar como pago.");
      }
    });
  }

  function markManyUnpaid(selected: Transaction[], onDone?: () => void) {
    const snapshots = selected.map((t) => ({ id: t.id, previousStatus: t.status, previousPaidAt: t.paidAt, followUpId: null }));
    startTransition(async () => {
      applyOptimistic({ type: "updateMany", ids: selected.map((t) => t.id), changes: { status: "pendente", paidAt: null } });
      try {
        await markManyFinanceTransactionsUnpaid(selected.map((t) => t.id));
        toast.success(`${selected.length} ${itemLabel}(s) marcado(s) como não pago.`, {
          action: { label: "Desfazer", onClick: () => revert(snapshots) },
        });
        onDone?.();
      } catch {
        toast.error("Não foi possível marcar como não pago.");
      }
    });
  }

  function cancelCharge(transactionId: string) {
    startTransition(async () => {
      applyOptimistic({ type: "update", id: transactionId, changes: { reminderId: null } });
      try {
        await cancelFinanceReminder(transactionId);
        toast.success("Cobrança programada cancelada.");
      } catch {
        toast.error("Não foi possível cancelar a cobrança.");
      }
    });
  }

  function removeMany(ids: string[], onDone?: () => void) {
    startTransition(async () => {
      applyOptimistic({ type: "remove", ids });
      try {
        await deleteManyFinanceTransactions(ids);
        toast.success(`${ids.length} ${itemLabel}(s) excluído(s).`);
        onDone?.();
      } catch {
        toast.error("Não foi possível excluir.");
      }
    });
  }

  return {
    transactions: optimisticTransactions,
    isPending,
    changeStatus,
    changeCategory,
    duplicate,
    remove,
    cancelCharge,
    markManyPaid,
    markManyUnpaid,
    removeMany,
  };
}

export type TransactionMutations = ReturnType<typeof useTransactionMutations>;
