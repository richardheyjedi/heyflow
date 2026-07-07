// Converte entre as linhas do Prisma e os tipos de domínio usados por toda a UI
// e por calculations.ts (src/lib/finance/types.ts). Manter essa camada fina é o
// que permite trocar a fonte de dados sem tocar em componentes/cálculos.

import type {
  FinanceBudget as PrismaFinanceBudget,
  FinanceCategory as PrismaFinanceCategory,
  FinanceClient as PrismaFinanceClient,
  FinanceReminder as PrismaFinanceReminder,
  FinanceTransaction as PrismaFinanceTransaction,
} from "@/generated/prisma/client";
import type { Budget, Category, Client, Reminder, Transaction } from "@/lib/finance/types";

type TransactionRow = PrismaFinanceTransaction & { reminder?: PrismaFinanceReminder | null };

/**
 * As colunas de data (dueDate, paidAt...) são datas "puras" (sem horário) —
 * gravadas como meia-noite UTC (`new Date("yyyy-MM-dd")` em actions.ts). Usar
 * `date-fns#format` aqui leria de volta no fuso LOCAL do processo e voltaria
 * um dia errado sempre que o servidor não rodar em UTC (ex.: dev local no
 * Brasil, UTC-3: meia-noite UTC de 1º vira 21h do dia 30 no horário local).
 * Extrair os componentes em UTC mantém a data em round-trip fiel, independente
 * do fuso onde o processo Node está rodando.
 */
function formatDateOnly(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toDomainTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    kind: row.kind,
    scope: row.scope,
    description: row.description,
    amountCents: row.amountCents,
    category: row.category,
    clientId: row.clientId,
    dueDate: formatDateOnly(row.dueDate),
    paidAt: row.paidAt ? formatDateOnly(row.paidAt) : null,
    status: row.status,
    recurrence: row.recurrenceFrequency
      ? {
          frequency: row.recurrenceFrequency,
          interval: row.recurrenceInterval ?? 1,
          nextDate: row.recurrenceNextDate ? formatDateOnly(row.recurrenceNextDate) : formatDateOnly(row.dueDate),
        }
      : null,
    installmentsRemaining: row.installmentsRemaining,
    reminderId: row.reminder?.id ?? null,
    originTransactionId: row.originTransactionId,
    isGoon: row.isGoon,
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
    date: formatDateOnly(row.date),
    message: row.message,
    createdAt: row.createdAt.toISOString(),
  };
}
