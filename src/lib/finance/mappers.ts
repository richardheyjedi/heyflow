// Converte entre as linhas do Prisma e os tipos de domínio usados por toda a UI
// e por calculations.ts (src/lib/finance/types.ts). Manter essa camada fina é o
// que permite trocar a fonte de dados sem tocar em componentes/cálculos.

import { format } from "date-fns";
import type {
  FinanceBudget as PrismaFinanceBudget,
  FinanceCategory as PrismaFinanceCategory,
  FinanceClient as PrismaFinanceClient,
  FinanceReminder as PrismaFinanceReminder,
  FinanceTransaction as PrismaFinanceTransaction,
} from "@/generated/prisma/client";
import type { Budget, Category, Client, Reminder, Transaction } from "@/lib/finance/types";

type TransactionRow = PrismaFinanceTransaction & { reminder?: PrismaFinanceReminder | null };

const ISO_DATE = "yyyy-MM-dd";

export function toDomainTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    kind: row.kind,
    scope: row.scope,
    description: row.description,
    amountCents: row.amountCents,
    category: row.category,
    clientId: row.clientId,
    dueDate: format(row.dueDate, ISO_DATE),
    paidAt: row.paidAt ? format(row.paidAt, ISO_DATE) : null,
    status: row.status,
    recurrence: row.recurrenceFrequency
      ? {
          frequency: row.recurrenceFrequency,
          interval: row.recurrenceInterval ?? 1,
          nextDate: row.recurrenceNextDate ? format(row.recurrenceNextDate, ISO_DATE) : format(row.dueDate, ISO_DATE),
        }
      : null,
    reminderId: row.reminder?.id ?? null,
    originTransactionId: row.originTransactionId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toDomainClient(row: PrismaFinanceClient): Client {
  return { id: row.id, name: row.name, color: row.color, kind: row.kind };
}

export function toDomainCategory(row: PrismaFinanceCategory): Category {
  return { id: row.id, name: row.name, group: row.group };
}

export function toDomainBudget(row: PrismaFinanceBudget): Budget {
  return { id: row.id, group: row.group, limitCents: row.limitCents };
}

export function toDomainReminder(row: PrismaFinanceReminder): Reminder {
  return {
    id: row.id,
    transactionId: row.transactionId,
    taskId: row.taskId,
    date: format(row.date, ISO_DATE),
    message: row.message,
    createdAt: row.createdAt.toISOString(),
  };
}
