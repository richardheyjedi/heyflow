// Funções de cálculo do módulo Financeiro — todas puras (sem efeitos colaterais,
// sempre retornam o mesmo resultado para a mesma entrada) para serem fáceis de
// testar isoladamente. Ver calculations.test.ts para exemplos de uso.

import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfMonth,
  format,
  isBefore,
  isWithinInterval,
  parseISO,
  startOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  PAYMENT_CUTOFF_DAYS,
  type Client,
  type RecurrenceRule,
  type Transaction,
  type TransactionFilters,
} from "@/lib/finance/types";

// ---------------------------------------------------------------------------
// Formatação
// ---------------------------------------------------------------------------

export function formatCurrencyBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function centsToInputValue(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function inputValueToCents(value: string): number {
  const normalized = value.replace(",", ".");
  const reais = Number.parseFloat(normalized);
  return Number.isFinite(reais) ? Math.round(reais * 100) : 0;
}

export function getClientName(clients: Client[], clientId: string | null): string | null {
  if (!clientId) return null;
  return clients.find((c) => c.id === clientId)?.name ?? null;
}

// ---------------------------------------------------------------------------
// Filtros
// ---------------------------------------------------------------------------

export function filterTransactions(
  transactions: Transaction[],
  filters: TransactionFilters,
  referenceDate: Date = new Date()
): Transaction[] {
  const { start, end } = getPeriodRange(filters, referenceDate);

  return transactions.filter((t) => {
    const due = parseISO(t.dueDate);
    if (!isWithinInterval(due, { start, end })) return false;
    if (filters.status !== "all" && t.status !== filters.status) return false;
    if (filters.clientId !== "all" && t.clientId !== filters.clientId) return false;
    if (filters.scope !== "all" && t.scope !== filters.scope) return false;
    return true;
  });
}

export function getPeriodRange(
  filters: TransactionFilters,
  referenceDate: Date = new Date()
): { start: Date; end: Date } {
  if (filters.period === "next_30_days") {
    return { start: referenceDate, end: addDays(referenceDate, 30) };
  }
  if (filters.period === "custom" && filters.customStart && filters.customEnd) {
    return { start: parseISO(filters.customStart), end: parseISO(filters.customEnd) };
  }
  return { start: startOfMonth(referenceDate), end: endOfMonth(referenceDate) };
}

// ---------------------------------------------------------------------------
// Cortes de pagamento
//
// Para cada corte (dia 5, 10, 15, 20, 25 e fim do mês) somamos todas as
// despesas NÃO PAGAS do mês corrente com vencimento até aquela data —
// é uma soma cumulativa a partir do dia 1, então o corte do dia 25 já
// inclui tudo que vence do dia 1 ao 25.
// ---------------------------------------------------------------------------

export type PaymentCutoff = {
  day: number;
  label: string;
  date: string; // ISO yyyy-MM-dd
  totalCents: number;
  count: number;
};

export function getPaymentCutoffs(transactions: Transaction[], referenceDate: Date = new Date()): PaymentCutoff[] {
  const monthStart = startOfMonth(referenceDate);
  const monthEnd = endOfMonth(referenceDate);
  const despesas = transactions.filter((t) => t.kind === "despesa" && t.status !== "pago");

  const cutoffDates = [...PAYMENT_CUTOFF_DAYS.map((day) => ({ day, date: new Date(monthStart.getFullYear(), monthStart.getMonth(), day) })), {
    day: monthEnd.getDate(),
    date: monthEnd,
  }];

  return cutoffDates.map(({ day, date }) => {
    const matching = despesas.filter((t) => {
      const due = parseISO(t.dueDate);
      return isWithinInterval(due, { start: monthStart, end: date }) || due.getTime() === date.getTime();
    });
    const totalCents = matching.reduce((sum, t) => sum + t.amountCents, 0);
    return {
      day,
      label: day === monthEnd.getDate() ? "Fim do mês" : `Dia ${day}`,
      date: format(date, "yyyy-MM-dd"),
      totalCents,
      count: matching.length,
    };
  });
}

// ---------------------------------------------------------------------------
// Mês quitado
// ---------------------------------------------------------------------------

export type MonthSettledStatus = {
  settled: boolean;
  remainingCents: number;
  remainingCount: number;
};

export function getMonthSettledStatus(transactions: Transaction[], referenceDate: Date = new Date()): MonthSettledStatus {
  const monthStart = startOfMonth(referenceDate);
  const monthEnd = endOfMonth(referenceDate);

  const despesasDoMes = transactions.filter(
    (t) => t.kind === "despesa" && isWithinInterval(parseISO(t.dueDate), { start: monthStart, end: monthEnd })
  );
  const pendentes = despesasDoMes.filter((t) => t.status !== "pago");

  return {
    settled: pendentes.length === 0,
    remainingCents: pendentes.reduce((sum, t) => sum + t.amountCents, 0),
    remainingCount: pendentes.length,
  };
}

// ---------------------------------------------------------------------------
// Totais / KPIs
//
// Recebido/pago usam a data de PAGAMENTO (regime de caixa real). A
// receber/a pagar usam os lançamentos ainda não pagos no conjunto informado.
// ---------------------------------------------------------------------------

export type FinanceTotals = {
  totalReceivableCents: number;
  totalPayableCents: number;
  totalReceivedCents: number;
  totalPaidCents: number;
  saldoMesCents: number;
  resultadoProjetadoCents: number;
};

export function getTotals(transactions: Transaction[]): FinanceTotals {
  const totalReceivableCents = sumBy(transactions, (t) => t.kind === "receita" && t.status !== "pago", "amountCents");
  const totalPayableCents = sumBy(transactions, (t) => t.kind === "despesa" && t.status !== "pago", "amountCents");
  const totalReceivedCents = sumBy(transactions, (t) => t.kind === "receita" && t.status === "pago", "amountCents");
  const totalPaidCents = sumBy(transactions, (t) => t.kind === "despesa" && t.status === "pago", "amountCents");

  return {
    totalReceivableCents,
    totalPayableCents,
    totalReceivedCents,
    totalPaidCents,
    saldoMesCents: totalReceivedCents - totalPaidCents,
    resultadoProjetadoCents: totalReceivableCents - totalPayableCents,
  };
}

function sumBy<T>(items: T[], predicate: (item: T) => boolean, key: keyof T): number {
  return items.filter(predicate).reduce((sum, item) => sum + (item[key] as unknown as number), 0);
}

// ---------------------------------------------------------------------------
// Série de fluxo de caixa (entradas x saídas por mês, para o gráfico)
// ---------------------------------------------------------------------------

export type CashFlowPoint = { monthKey: string; label: string; entradas: number; saidas: number };

export function getCashFlowSeries(
  transactions: Transaction[],
  monthsBack = 5,
  referenceDate: Date = new Date()
): CashFlowPoint[] {
  const months = Array.from({ length: monthsBack + 1 }, (_, i) => addMonths(referenceDate, i - monthsBack));

  return months.map((month) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const paidInMonth = transactions.filter((t) => t.paidAt && isWithinInterval(parseISO(t.paidAt), { start, end }));

    return {
      monthKey: format(month, "yyyy-MM"),
      label: format(month, "MMM/yy", { locale: ptBR }),
      entradas: paidInMonth.filter((t) => t.kind === "receita").reduce((s, t) => s + t.amountCents, 0) / 100,
      saidas: paidInMonth.filter((t) => t.kind === "despesa").reduce((s, t) => s + t.amountCents, 0) / 100,
    };
  });
}

// ---------------------------------------------------------------------------
// Alertas de vencimento
// ---------------------------------------------------------------------------

export type DueAlert = Transaction & { isOverdue: boolean; daysUntilDue: number };

export function getUpcomingDue(transactions: Transaction[], days = 7, referenceDate: Date = new Date()): DueAlert[] {
  const horizon = addDays(referenceDate, days);

  return transactions
    .filter((t) => t.status !== "pago" && !isBefore(horizon, parseISO(t.dueDate)))
    .map((t) => {
      const due = parseISO(t.dueDate);
      return {
        ...t,
        isOverdue: isBefore(due, referenceDate) && due.toDateString() !== referenceDate.toDateString(),
        daysUntilDue: Math.round((due.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)),
      };
    })
    .sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());
}

// ---------------------------------------------------------------------------
// Recorrência
// ---------------------------------------------------------------------------

export function computeNextRecurrenceDate(from: Date, rule: Pick<RecurrenceRule, "frequency" | "interval">): Date {
  switch (rule.frequency) {
    case "semanal":
      return addWeeks(from, rule.interval);
    case "quinzenal":
      return addWeeks(from, rule.interval * 2);
    case "mensal":
      return addMonths(from, rule.interval);
    case "anual":
      return addYears(from, rule.interval);
    default:
      return from;
  }
}

/**
 * Gera a próxima ocorrência de uma transação recorrente (não muta a original).
 * Deve ser chamada quando a ocorrência atual é marcada como paga.
 */
export function generateNextOccurrence(transaction: Transaction, genId: () => string): Transaction | null {
  if (!transaction.recurrence) return null;

  const nextDueDate = transaction.recurrence.nextDate;
  const followingDate = computeNextRecurrenceDate(parseISO(nextDueDate), transaction.recurrence);
  const now = new Date().toISOString();

  return {
    ...transaction,
    id: genId(),
    dueDate: nextDueDate,
    paidAt: null,
    status: "pendente",
    reminderId: null,
    originTransactionId: transaction.originTransactionId ?? transaction.id,
    recurrence: { ...transaction.recurrence, nextDate: format(followingDate, "yyyy-MM-dd") },
    createdAt: now,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Projeção de saldo (próximos N meses)
//
// Para cada mês futuro somamos: (a) lançamentos já existentes com vencimento
// naquele mês, e (b) ocorrências futuras "virtuais" de transações recorrentes
// — projetadas a partir de `recurrence.nextDate` andando a regra para frente,
// sem criar registros de verdade (só para o cálculo da projeção).
// ---------------------------------------------------------------------------

export type MonthProjection = {
  monthKey: string;
  label: string;
  receitasCents: number;
  despesasCents: number;
  saldoCents: number;
};

export function projectBalance(
  transactions: Transaction[],
  monthsAhead = 3,
  referenceDate: Date = new Date()
): MonthProjection[] {
  const targetMonths = Array.from({ length: monthsAhead }, (_, i) => addMonths(referenceDate, i + 1));

  return targetMonths.map((month) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);

    const existing = transactions.filter((t) => isWithinInterval(parseISO(t.dueDate), { start, end }));
    let receitasCents = existing.filter((t) => t.kind === "receita").reduce((s, t) => s + t.amountCents, 0);
    let despesasCents = existing.filter((t) => t.kind === "despesa").reduce((s, t) => s + t.amountCents, 0);

    for (const t of transactions) {
      if (!t.recurrence) continue;
      let cursor = parseISO(t.recurrence.nextDate);
      let iterations = 0;
      while (isBefore(cursor, end) || cursor.toDateString() === end.toDateString()) {
        if (iterations++ > 36) break; // trava de segurança
        if (isWithinInterval(cursor, { start, end })) {
          if (t.kind === "receita") receitasCents += t.amountCents;
          else despesasCents += t.amountCents;
        }
        cursor = computeNextRecurrenceDate(cursor, t.recurrence);
      }
    }

    return {
      monthKey: format(month, "yyyy-MM"),
      label: format(month, "MMMM/yy", { locale: ptBR }),
      receitasCents,
      despesasCents,
      saldoCents: receitasCents - despesasCents,
    };
  });
}

// ---------------------------------------------------------------------------
// DRE simplificado (mês corrente, por competência/vencimento)
// ---------------------------------------------------------------------------

export type DRESummary = {
  receitaTotalCents: number;
  despesaTotalCents: number;
  resultadoCents: number;
  despesasPorCategoria: { category: string; totalCents: number }[];
};

export function getDRE(transactions: Transaction[], referenceDate: Date = new Date()): DRESummary {
  const start = startOfMonth(referenceDate);
  const end = endOfMonth(referenceDate);
  const doMes = transactions.filter((t) => isWithinInterval(parseISO(t.dueDate), { start, end }));

  const receitaTotalCents = doMes.filter((t) => t.kind === "receita").reduce((s, t) => s + t.amountCents, 0);
  const despesas = doMes.filter((t) => t.kind === "despesa");
  const despesaTotalCents = despesas.reduce((s, t) => s + t.amountCents, 0);

  const byCategory = new Map<string, number>();
  for (const t of despesas) {
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amountCents);
  }

  return {
    receitaTotalCents,
    despesaTotalCents,
    resultadoCents: receitaTotalCents - despesaTotalCents,
    despesasPorCategoria: Array.from(byCategory.entries())
      .map(([category, totalCents]) => ({ category, totalCents }))
      .sort((a, b) => b.totalCents - a.totalCents),
  };
}

// ---------------------------------------------------------------------------
// Exportação CSV
// ---------------------------------------------------------------------------

export function transactionsToCSV(transactions: Transaction[], clients: Client[]): string {
  const header = ["Tipo", "Escopo", "Descrição", "Categoria", "Cliente", "Valor (R$)", "Vencimento", "Pagamento", "Status"];
  const rows = transactions.map((t) => [
    t.kind === "receita" ? "Receita" : "Despesa",
    t.scope,
    escapeCsvField(t.description),
    escapeCsvField(t.category),
    escapeCsvField(getClientName(clients, t.clientId) ?? ""),
    (t.amountCents / 100).toFixed(2).replace(".", ","),
    t.dueDate,
    t.paidAt ?? "",
    t.status,
  ]);

  return [header, ...rows].map((row) => row.join(";")).join("\n");
}

function escapeCsvField(value: string): string {
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
