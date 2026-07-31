"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { addMonths, endOfMonth, startOfMonth } from "date-fns";
import { createTask } from "@/lib/actions/tasks";
import { computeNextRecurrenceDate, getMonthClosureSummary } from "@/lib/finance/calculations";
import { toDomainCategory, toDomainClient, toDomainMonthClosure, toDomainTransaction } from "@/lib/finance/mappers";
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
  installmentsRemaining: number | null;
  isGoon: boolean;
};

/** Estado anterior de um lançamento antes de uma mudança de status — usado para desfazer. */
export type StatusChangeSnapshot = {
  id: string;
  previousStatus: TransactionStatus;
  previousPaidAt: string | null;
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
      isGoon: input.isGoon,
      installmentsRemaining: input.installmentsRemaining,
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
      isGoon: input.isGoon,
      installmentsRemaining: input.installmentsRemaining,
      ...toRecurrenceData(input.recurrence),
    },
  });
  revalidateFinance();
}

/** Campos simples editáveis direto na tabela (estilo planilha) — subconjunto de TransactionInput. */
export type TransactionFieldsPatch = Partial<{
  kind: TransactionKind;
  scope: OwnerScope;
  description: string;
  amountCents: number;
  clientId: string | null;
  dueDate: string;
}>;

/** Usada pela edição inline (estilo planilha): atualiza só os campos presentes no patch. */
export async function updateFinanceTransactionFields(id: string, patch: TransactionFieldsPatch) {
  const data: Record<string, unknown> = {};

  if (patch.description !== undefined) {
    const trimmed = patch.description.trim();
    if (!trimmed) throw new Error("Descrição não pode ser vazia.");
    data.description = trimmed;
  }
  if (patch.amountCents !== undefined) {
    if (patch.amountCents <= 0) throw new Error("O valor deve ser maior que zero.");
    data.amountCents = patch.amountCents;
  }
  if (patch.dueDate !== undefined) data.dueDate = new Date(patch.dueDate);
  if (patch.kind !== undefined) data.kind = patch.kind;
  if (patch.scope !== undefined) data.scope = patch.scope;
  if (patch.clientId !== undefined) data.clientId = patch.clientId;

  if (Object.keys(data).length === 0) return;

  await prisma.financeTransaction.update({ where: { id }, data });
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
      isGoon: original.isGoon,
      recurrenceFrequency: original.recurrenceFrequency,
      recurrenceInterval: original.recurrenceInterval,
      recurrenceNextDate: original.recurrenceNextDate,
      installmentsRemaining: original.installmentsRemaining,
    },
  });
  revalidateFinance();
}

/** Retorna o id da parcela/ocorrência seguinte criada automaticamente, se houver. */
async function applyMarkPaid(id: string): Promise<string | null> {
  const transaction = await prisma.financeTransaction.findUnique({ where: { id } });
  if (!transaction) return null;

  await prisma.financeTransaction.update({
    where: { id },
    data: { status: "pago", paidAt: new Date() },
  });

  const originId = transaction.originTransactionId ?? transaction.id;

  if (transaction.recurrenceFrequency && transaction.recurrenceNextDate) {
    // Desmarcar e marcar como pago de novo não deve duplicar a próxima
    // ocorrência: se ela já existe (mesma origem + vencimento) e não foi paga,
    // não cria outra.
    const existingNext = await prisma.financeTransaction.findFirst({
      where: {
        originTransactionId: originId,
        dueDate: transaction.recurrenceNextDate,
        status: { not: "pago" },
      },
    });
    if (existingNext) return null;

    const followingDate = computeNextRecurrenceDate(transaction.recurrenceNextDate, {
      frequency: transaction.recurrenceFrequency,
      interval: transaction.recurrenceInterval ?? 1,
    });

    const created = await prisma.financeTransaction.create({
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
        isGoon: transaction.isGoon,
        recurrenceFrequency: transaction.recurrenceFrequency,
        recurrenceInterval: transaction.recurrenceInterval,
        recurrenceNextDate: followingDate,
        originTransactionId: originId,
      },
    });
    return created.id;
  }

  // Parcelamento: se restar mais de 1 parcela (incluindo esta que acabou de ser
  // paga), gera a próxima pro mês seguinte já com o contador decrementado.
  if (transaction.installmentsRemaining && transaction.installmentsRemaining > 1) {
    // Mesma proteção da recorrência: não duplica a próxima parcela ao
    // desmarcar/marcar como pago de novo.
    const nextDueDate = addMonths(transaction.dueDate, 1);
    const existingNext = await prisma.financeTransaction.findFirst({
      where: {
        originTransactionId: originId,
        dueDate: nextDueDate,
        status: { not: "pago" },
      },
    });
    if (existingNext) return null;

    const created = await prisma.financeTransaction.create({
      data: {
        kind: transaction.kind,
        scope: transaction.scope,
        description: transaction.description,
        amountCents: transaction.amountCents,
        category: transaction.category,
        clientId: transaction.clientId,
        dueDate: nextDueDate,
        paidAt: null,
        status: "pendente",
        isGoon: transaction.isGoon,
        installmentsRemaining: transaction.installmentsRemaining - 1,
        originTransactionId: originId,
      },
    });
    return created.id;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Ações em massa (planilha) — mesmas regras das ações individuais, sem
// disparar uma revalidação por item.
// ---------------------------------------------------------------------------

export async function markManyFinanceTransactionsPaid(ids: string[]) {
  // Cada item é independente (update próprio + possível próxima ocorrência) —
  // em paralelo, o tempo total é o do item mais lento, não a soma de todos.
  // O mapa id -> id da parcela/ocorrência seguinte permite desfazer em massa.
  const entries = await Promise.all(ids.map(async (id) => [id, await applyMarkPaid(id)] as const));
  revalidateFinance();
  return Object.fromEntries(entries) as Record<string, string | null>;
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
  if (status === "pago") {
    const followUpId = await applyMarkPaid(id);
    revalidateFinance();
    return followUpId;
  }

  await prisma.financeTransaction.update({
    where: { id },
    data: { status, paidAt: null },
  });
  revalidateFinance();
  return null;
}

/**
 * Desfaz uma ou mais mudanças de status (ex.: marcar como pago sem querer).
 * Se a mudança tiver gerado uma parcela/ocorrência seguinte automaticamente,
 * ela é removida — mas só enquanto ainda estiver "pendente" e intocada, pra
 * não apagar algo que o usuário já editou depois.
 */
export async function revertFinanceTransactionsStatus(
  snapshots: (StatusChangeSnapshot & { followUpId: string | null })[]
) {
  const followUpIds = snapshots.map((s) => s.followUpId).filter((v): v is string => v !== null);
  if (followUpIds.length > 0) {
    await prisma.financeTransaction.deleteMany({
      where: { id: { in: followUpIds }, status: "pendente" },
    });
  }

  await Promise.all(
    snapshots.map((s) =>
      prisma.financeTransaction.update({
        where: { id: s.id },
        data: {
          status: s.previousStatus,
          paidAt: s.previousPaidAt ? new Date(s.previousPaidAt) : null,
        },
      })
    )
  );
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
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Nome do cliente não pode ser vazio.");

  // Evita duplicar clientes/fornecedores pelo nome (mesma regra das categorias),
  // ignorando maiúsculas/minúsculas — SQLite não tem busca case-insensitive no Prisma.
  const clients = await prisma.financeClient.findMany();
  const existing = clients.find((c) => c.name.trim().toLowerCase() === trimmed.toLowerCase());
  if (existing) return toDomainClient(existing);

  const color = CLIENT_COLOR_OPTIONS[Math.floor(Math.random() * CLIENT_COLOR_OPTIONS.length)];
  const client = await prisma.financeClient.create({
    data: { name: trimmed, kind, color },
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

/** Cancela a cobrança programada de um lançamento: apaga o lembrete e a Task criada para ele. */
export async function cancelFinanceReminder(transactionId: string) {
  const reminder = await prisma.financeReminder.findUnique({ where: { transactionId } });
  if (!reminder) return;

  await prisma.financeReminder.delete({ where: { id: reminder.id } });
  if (reminder.taskId) {
    await prisma.task.deleteMany({ where: { id: reminder.taskId } });
  }
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

// ---------------------------------------------------------------------------
// Fechamento de mês ("virar o mês")
//
// Congela um snapshot dos totais do mês em FinanceMonthClosure (para consultar
// "como fechou" aquele mês sem recalcular sobre todo o histórico) e depois
// descarta as despesas avulsas que ficaram pendentes: sem recorrência e sem
// parcelas restantes, e ainda não pagas. Recorrências, parcelamentos e
// qualquer despesa já paga continuam intactos — DRE, fluxo de caixa e
// estatísticas de cliente seguem dependendo deles. Idempotente: fechar o
// mesmo mês de novo apenas retorna o snapshot existente (sem excluir de novo).
// ---------------------------------------------------------------------------

/**
 * Reabre um mês fechado: apaga o snapshot, permitindo fechar de novo.
 * As despesas avulsas descartadas no fechamento NÃO voltam — o snapshot é só
 * o registro dos totais; a exclusão delas é irreversível.
 */
export async function deleteFinanceMonthClosure(id: string) {
  await prisma.financeMonthClosure.delete({ where: { id } });
  revalidateFinance();
}

export async function closeFinanceMonth(referenceDateISO?: string) {
  const referenceDate = referenceDateISO ? new Date(referenceDateISO) : new Date();
  const monthKey = referenceDate.toISOString().slice(0, 7);

  const existing = await prisma.financeMonthClosure.findUnique({ where: { monthKey } });
  if (existing) return toDomainMonthClosure(existing);

  const rows = await prisma.financeTransaction.findMany();
  const transactions = rows.map((row) => toDomainTransaction(row));
  const summary = getMonthClosureSummary(transactions, referenceDate);

  const [closure] = await prisma.$transaction([
    prisma.financeMonthClosure.create({
      data: {
        monthKey: summary.monthKey,
        totalReceivedCents: summary.totalReceivedCents,
        totalPaidCents: summary.totalPaidCents,
        totalReceivableCents: summary.totalReceivableCents,
        totalPayableCents: summary.totalPayableCents,
        saldoCents: summary.saldoCents,
        pendingCount: summary.pendingCount,
      },
    }),
    prisma.financeTransaction.deleteMany({
      where: {
        kind: "despesa",
        isGoon: false,
        status: { not: "pago" },
        recurrenceFrequency: null,
        OR: [{ installmentsRemaining: null }, { installmentsRemaining: { lte: 0 } }],
        dueDate: { gte: startOfMonth(referenceDate), lte: endOfMonth(referenceDate) },
      },
    }),
  ]);

  revalidateFinance();
  return toDomainMonthClosure(closure);
}
