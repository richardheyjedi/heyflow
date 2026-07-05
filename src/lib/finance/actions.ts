"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createTask } from "@/lib/actions/tasks";
import { computeNextRecurrenceDate } from "@/lib/finance/calculations";
import { toDomainCategory, toDomainClient } from "@/lib/finance/mappers";
import type {
  CategoryGroup,
  OwnerScope,
  RecurrenceFrequency,
  TransactionKind,
  TransactionStatus,
} from "@/lib/finance/types";

export type TransactionInput = {
  kind: TransactionKind;
  scope: OwnerScope;
  description: string;
  amountCents: number;
  category: string;
  clientId: string | null;
  dueDate: string;
  paidAt: string | null;
  status: TransactionStatus;
  recurrence: { frequency: RecurrenceFrequency; interval: number; nextDate: string } | null;
};

function revalidateFinance() {
  revalidatePath("/financeiro");
}

function toRecurrenceData(recurrence: TransactionInput["recurrence"]) {
  return {
    recurrenceFrequency: recurrence?.frequency ?? null,
    recurrenceInterval: recurrence?.interval ?? null,
    recurrenceNextDate: recurrence ? new Date(recurrence.nextDate) : null,
  };
}

export async function createFinanceTransaction(input: TransactionInput) {
  await prisma.financeTransaction.create({
    data: {
      kind: input.kind,
      scope: input.scope,
      description: input.description,
      amountCents: input.amountCents,
      category: input.category,
      clientId: input.clientId,
      dueDate: new Date(input.dueDate),
      paidAt: input.paidAt ? new Date(input.paidAt) : null,
      status: input.status,
      ...toRecurrenceData(input.recurrence),
    },
  });
  revalidateFinance();
}

export async function updateFinanceTransaction(id: string, input: TransactionInput) {
  await prisma.financeTransaction.update({
    where: { id },
    data: {
      kind: input.kind,
      scope: input.scope,
      description: input.description,
      amountCents: input.amountCents,
      category: input.category,
      clientId: input.clientId,
      dueDate: new Date(input.dueDate),
      paidAt: input.paidAt ? new Date(input.paidAt) : null,
      status: input.status,
      ...toRecurrenceData(input.recurrence),
    },
  });
  revalidateFinance();
}

export async function deleteFinanceTransaction(id: string) {
  await prisma.financeTransaction.delete({ where: { id } });
  revalidateFinance();
}

export async function duplicateFinanceTransaction(id: string) {
  const original = await prisma.financeTransaction.findUnique({ where: { id } });
  if (!original) return;

  await prisma.financeTransaction.create({
    data: {
      kind: original.kind,
      scope: original.scope,
      description: `${original.description} (cópia)`,
      amountCents: original.amountCents,
      category: original.category,
      clientId: original.clientId,
      dueDate: original.dueDate,
      paidAt: null,
      status: "pendente",
      recurrenceFrequency: original.recurrenceFrequency,
      recurrenceInterval: original.recurrenceInterval,
      recurrenceNextDate: original.recurrenceNextDate,
    },
  });
  revalidateFinance();
}

async function applyMarkPaid(id: string) {
  const transaction = await prisma.financeTransaction.findUnique({ where: { id } });
  if (!transaction) return;

  await prisma.financeTransaction.update({
    where: { id },
    data: { status: "pago", paidAt: new Date() },
  });

  if (transaction.recurrenceFrequency && transaction.recurrenceNextDate) {
    const followingDate = computeNextRecurrenceDate(transaction.recurrenceNextDate, {
      frequency: transaction.recurrenceFrequency,
      interval: transaction.recurrenceInterval ?? 1,
    });

    await prisma.financeTransaction.create({
      data: {
        kind: transaction.kind,
        scope: transaction.scope,
        description: transaction.description,
        amountCents: transaction.amountCents,
        category: transaction.category,
        clientId: transaction.clientId,
        dueDate: transaction.recurrenceNextDate,
        paidAt: null,
        status: "pendente",
        recurrenceFrequency: transaction.recurrenceFrequency,
        recurrenceInterval: transaction.recurrenceInterval,
        recurrenceNextDate: followingDate,
        originTransactionId: transaction.originTransactionId ?? transaction.id,
      },
    });
  }
}

export async function markFinanceTransactionPaid(id: string) {
  await applyMarkPaid(id);
  revalidateFinance();
}

export async function markFinanceTransactionUnpaid(id: string) {
  await prisma.financeTransaction.update({
    where: { id },
    data: { status: "pendente", paidAt: null },
  });
  revalidateFinance();
}

// ---------------------------------------------------------------------------
// Ações em massa (planilha) — mesmas regras das ações individuais, sem
// disparar uma revalidação por item.
// ---------------------------------------------------------------------------

export async function markManyFinanceTransactionsPaid(ids: string[]) {
  for (const id of ids) {
    await applyMarkPaid(id);
  }
  revalidateFinance();
}

export async function markManyFinanceTransactionsUnpaid(ids: string[]) {
  await prisma.financeTransaction.updateMany({
    where: { id: { in: ids } },
    data: { status: "pendente", paidAt: null },
  });
  revalidateFinance();
}

export async function deleteManyFinanceTransactions(ids: string[]) {
  await prisma.financeTransaction.deleteMany({ where: { id: { in: ids } } });
  revalidateFinance();
}

/** Usada pela edição inline (estilo planilha): muda só o status de um lançamento. */
export async function updateFinanceTransactionStatus(id: string, status: TransactionStatus) {
  if (status === "pago") return markFinanceTransactionPaid(id);

  await prisma.financeTransaction.update({
    where: { id },
    data: { status, paidAt: null },
  });
  revalidateFinance();
}

/** Usada pela edição inline (estilo planilha): muda só a categoria de um lançamento. */
export async function updateFinanceTransactionCategory(id: string, category: string) {
  await prisma.financeTransaction.update({ where: { id }, data: { category } });
  revalidateFinance();
}

export async function createFinanceCategory(name: string, group: CategoryGroup = "outro") {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Nome da categoria não pode ser vazio.");

  const existing = await prisma.financeCategory.findUnique({ where: { name: trimmed } });
  if (existing) return toDomainCategory(existing);

  const category = await prisma.financeCategory.create({ data: { name: trimmed, group } });
  revalidateFinance();
  return toDomainCategory(category);
}

export async function updateFinanceCategory(id: string, name: string, group: CategoryGroup) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Nome da categoria não pode ser vazio.");

  const current = await prisma.financeCategory.findUnique({ where: { id } });
  if (!current) return;

  await prisma.$transaction([
    prisma.financeCategory.update({ where: { id }, data: { name: trimmed, group } }),
    // Mantém os lançamentos existentes apontando para o novo nome da categoria.
    prisma.financeTransaction.updateMany({
      where: { category: current.name },
      data: { category: trimmed },
    }),
  ]);

  revalidateFinance();
}

export async function deleteFinanceCategory(id: string) {
  await prisma.financeCategory.delete({ where: { id } });
  revalidateFinance();
}

const CLIENT_COLOR_OPTIONS = ["#8B5CF6", "#A855F7", "#C084FC", "#60A5FA", "#F59E0B", "#FB7185"];

export async function createFinanceClient(name: string, kind: OwnerScope) {
  const color = CLIENT_COLOR_OPTIONS[Math.floor(Math.random() * CLIENT_COLOR_OPTIONS.length)];
  const client = await prisma.financeClient.create({
    data: { name: name.trim(), kind, color },
  });
  revalidateFinance();
  return toDomainClient(client);
}

export async function updateFinanceClient(id: string, data: { name: string; kind: OwnerScope; color: string }) {
  const trimmed = data.name.trim();
  if (!trimmed) throw new Error("Nome do cliente não pode ser vazio.");

  const client = await prisma.financeClient.update({
    where: { id },
    data: { name: trimmed, kind: data.kind, color: data.color },
  });
  revalidateFinance();
  return toDomainClient(client);
}

/** Lançamentos ligados a este cliente ficam sem cliente (onDelete: SetNull) — não são apagados. */
export async function deleteFinanceClient(id: string) {
  await prisma.financeClient.delete({ where: { id } });
  revalidateFinance();
}

export async function scheduleFinanceReminder(transactionId: string, date: string, message: string) {
  // Integração real com o TaskFlow: cria uma Task de verdade para o lembrete.
  const task = await createTask({
    title: message,
    description: null,
    projectId: null,
    status: "todo",
    priority: "high",
    dueDate: date,
    dueTime: null,
    recurrenceRule: null,
    tagIds: [],
    subtasks: [],
  });

  await prisma.financeReminder.create({
    data: { transactionId, taskId: task.id, date: new Date(date), message },
  });

  revalidateFinance();
}

// ---------------------------------------------------------------------------
// Orçamento por grupo
// ---------------------------------------------------------------------------

export async function setFinanceBudget(group: CategoryGroup, limitCents: number) {
  if (limitCents <= 0) throw new Error("O limite do orçamento deve ser maior que zero.");

  await prisma.financeBudget.upsert({
    where: { group },
    create: { group, limitCents },
    update: { limitCents },
  });
  revalidateFinance();
}

export async function removeFinanceBudget(group: CategoryGroup) {
  await prisma.financeBudget.deleteMany({ where: { group } });
  revalidateFinance();
}
