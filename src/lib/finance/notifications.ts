import { differenceInCalendarDays, endOfMonth, parseISO, startOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/generated/prisma/client";
import { getFinanceBudgets, getFinanceCategories, getFinanceTransactions } from "@/lib/finance/data";
import { formatCurrencyBRL, getBudgetStatus, getMonthSettledStatus, getPaymentCutoffs } from "@/lib/finance/calculations";
import { CATEGORY_GROUP_LABEL } from "@/lib/finance/types";

/**
 * Job simples (mesmo padrão de generateDueNotifications em lib/data/notifications.ts):
 * roda a cada carregamento de página e mantém, no MESMO sino do TaskFlow, até
 * uma notificação por mês para cada situação do financeiro — identificada por
 * um marcador estável dentro da mensagem. Se a situação já tinha gerado uma
 * notificação este mês, ela é ATUALIZADA (valores/mensagem + volta a não lida)
 * em vez de duplicada, para não perder informação quando os números mudam.
 */
export async function generateFinanceNotifications() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [allTransactions, categories, budgets] = await Promise.all([
    getFinanceTransactions(),
    getFinanceCategories(),
    getFinanceBudgets(),
  ]);
  // GOON é isolado do financeiro principal — não deve gerar/alterar alertas de
  // mês quitado, corte de pagamento ou orçamento por grupo.
  const transactions = allTransactions.filter((t) => !t.isGoon);

  await notifyMonthSettled(transactions, monthStart, monthEnd, now);
  await notifyUpcomingCutoffs(transactions, monthStart, monthEnd, now);
  await notifyBudgetExceeded(transactions, categories, budgets, monthStart, monthEnd, now);
}

async function upsertMonthlyNotification(
  type: NotificationType,
  marker: string,
  message: string,
  monthStart: Date,
  monthEnd: Date
) {
  const existing = await prisma.notification.findFirst({
    where: { type, createdAt: { gte: monthStart, lte: monthEnd }, message: { contains: marker } },
  });

  if (existing) {
    if (existing.message === message && existing.read === false) return;
    await prisma.notification.update({ where: { id: existing.id }, data: { message, read: false } });
    return;
  }

  await prisma.notification.create({ data: { type, message } });
}

async function notifyMonthSettled(
  transactions: Awaited<ReturnType<typeof getFinanceTransactions>>,
  monthStart: Date,
  monthEnd: Date,
  now: Date
) {
  const settled = getMonthSettledStatus(transactions, now);
  if (!settled.settled) return;

  const marker = "Mês quitado";
  await upsertMonthlyNotification(
    "month_settled",
    marker,
    `${marker} — todas as contas do mês estão pagas.`,
    monthStart,
    monthEnd
  );
}

async function notifyUpcomingCutoffs(
  transactions: Awaited<ReturnType<typeof getFinanceTransactions>>,
  monthStart: Date,
  monthEnd: Date,
  now: Date
) {
  const cutoffs = getPaymentCutoffs(transactions, now);

  for (const cutoff of cutoffs) {
    if (cutoff.totalCents === 0) continue;
    const daysUntil = differenceInCalendarDays(parseISO(cutoff.date), now);
    if (daysUntil < 0 || daysUntil > 3) continue;

    const marker = `corte de ${cutoff.label}`;
    await upsertMonthlyNotification(
      "cutoff_reminder",
      marker,
      `Faltam ${formatCurrencyBRL(cutoff.totalCents)} para o ${marker} (${cutoff.count} conta${cutoff.count === 1 ? "" : "s"}).`,
      monthStart,
      monthEnd
    );
  }
}

async function notifyBudgetExceeded(
  transactions: Awaited<ReturnType<typeof getFinanceTransactions>>,
  categories: Awaited<ReturnType<typeof getFinanceCategories>>,
  budgets: Awaited<ReturnType<typeof getFinanceBudgets>>,
  monthStart: Date,
  monthEnd: Date,
  now: Date
) {
  const statuses = getBudgetStatus(transactions, categories, budgets, now);

  for (const status of statuses) {
    if (!status.isOverBudget || status.limitCents === null) continue;

    const marker = `orçamento de ${CATEGORY_GROUP_LABEL[status.group]}`;
    await upsertMonthlyNotification(
      "budget_exceeded",
      marker,
      `Você estourou o ${marker}: ${formatCurrencyBRL(status.spentCents)} de ${formatCurrencyBRL(status.limitCents)}.`,
      monthStart,
      monthEnd
    );
  }
}
