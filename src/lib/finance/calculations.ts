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
  startOfDay,
  startOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  PAYMENT_CUTOFF_DAYS,
  type Budget,
  type Category,
  type CategoryGroup,
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
  // Aceita formatos brasileiros ("1.234,56") e simples ("1234.56"): quando há
  // vírgula, os pontos são separadores de milhar; sem vírgula, um único ponto
  // é decimal, e "1.234" (padrão de milhar) também precisa valer 1234 reais.
  const trimmed = value.trim().replace(/[R$\s]/g, "");
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(\.\d{3})+$/.test(trimmed)
      ? trimmed.replace(/\./g, "")
      : trimmed;
  const reais = Number.parseFloat(normalized);
  return Number.isFinite(reais) ? Math.round(reais * 100) : 0;
}

export function getClientName(clients: Client[], clientId: string | null): string | null {
  if (!clientId) return null;
  return clients.find((c) => c.id === clientId)?.name ?? null;
}

/** Vencido e ainda não pago — comparação por dia (ignora horário) para não marcar o próprio dia do vencimento como atrasado. */
export function isTransactionOverdue(transaction: Transaction, referenceDate: Date = new Date()): boolean {
  if (transaction.status === "pago") return false;
  return isBefore(startOfDay(parseISO(transaction.dueDate)), startOfDay(referenceDate));
}

// ---------------------------------------------------------------------------
// Filtros
// ---------------------------------------------------------------------------

export function filterTransactions(
  transactions: Transaction[],
  filters: TransactionFilters,
  referenceDate: Date = new Date(),
  categories: Category[] = []
): Transaction[] {
  const { start, end } = getPeriodRange(filters, referenceDate);
  const groupByCategoryName = new Map(categories.map((c) => [c.name, c.group]));
  // "Atrasados" é um recorte que ignora o período selecionado — do contrário,
  // uma conta vencida em um mês anterior nunca apareceria com o filtro "Mês atual".
  const overdueOnly = filters.status === "atrasado";

  return transactions.filter((t) => {
    if (overdueOnly) {
      if (!isTransactionOverdue(t, referenceDate)) return false;
    } else {
      const due = parseISO(t.dueDate);
      if (!isWithinInterval(due, { start, end })) return false;
      if (filters.status !== "all" && t.status !== filters.status) return false;
    }
    if (filters.clientId !== "all" && t.clientId !== filters.clientId) return false;
    if (filters.scope !== "all" && t.scope !== filters.scope) return false;
    if (filters.categoryGroup !== "all" && groupByCategoryName.get(t.category) !== filters.categoryGroup) return false;
    return true;
  });
}

function getPeriodRange(
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
// Despesas por grupo de categoria (Casa / Pessoal / Negócio / Outro)
// ---------------------------------------------------------------------------

const GROUP_ORDER: CategoryGroup[] = ["casa", "pessoal", "negocio", "outro"];

function sumExpensesByGroupInMonth(
  transactions: Transaction[],
  categories: Category[],
  referenceDate: Date
): Map<CategoryGroup, number> {
  const start = startOfMonth(referenceDate);
  const end = endOfMonth(referenceDate);
  const groupByCategoryName = new Map(categories.map((c) => [c.name, c.group]));

  const despesasDoMes = transactions.filter(
    (t) => t.kind === "despesa" && isWithinInterval(parseISO(t.dueDate), { start, end })
  );

  const totals = new Map<CategoryGroup, number>();
  for (const t of despesasDoMes) {
    const group = groupByCategoryName.get(t.category) ?? "outro";
    totals.set(group, (totals.get(group) ?? 0) + t.amountCents);
  }
  return totals;
}

// ---------------------------------------------------------------------------
// Orçamento por grupo — compara o gasto do mês com o limite definido
// ---------------------------------------------------------------------------

export type BudgetStatus = {
  group: CategoryGroup;
  spentCents: number;
  limitCents: number | null;
  /** 0-100+, null quando não há limite definido para o grupo. */
  percentage: number | null;
  isOverBudget: boolean;
};

export function getBudgetStatus(
  transactions: Transaction[],
  categories: Category[],
  budgets: Budget[],
  referenceDate: Date = new Date()
): BudgetStatus[] {
  const spentByGroup = sumExpensesByGroupInMonth(transactions, categories, referenceDate);
  const limitByGroup = new Map(budgets.map((b) => [b.group, b.limitCents]));

  return GROUP_ORDER.map((group) => {
    const spentCents = spentByGroup.get(group) ?? 0;
    const limitCents = limitByGroup.get(group) ?? null;
    const percentage = limitCents ? Math.round((spentCents / limitCents) * 100) : null;
    return {
      group,
      spentCents,
      limitCents,
      percentage,
      isOverBudget: limitCents !== null && spentCents > limitCents,
    };
  }).filter((entry) => entry.limitCents !== null || entry.spentCents > 0);
}

// ---------------------------------------------------------------------------
// Estatísticas por cliente/fornecedor
// ---------------------------------------------------------------------------

export type ClientStats = {
  client: Client;
  receivedCents: number;
  receivableCents: number;
  paidOutCents: number;
  payableCents: number;
  overdueCents: number;
  transactionCount: number;
  /** Data de criação do lançamento mais recente (não o vencimento mais distante). */
  lastCreatedAt: string | null;
};

export function getClientStats(transactions: Transaction[], clients: Client[], referenceDate: Date = new Date()): ClientStats[] {
  return clients.map((client) => {
    const own = transactions.filter((t) => t.clientId === client.id);
    return {
      client,
      receivedCents: sumBy(own, (t) => t.kind === "receita" && t.status === "pago", "amountCents"),
      receivableCents: sumBy(own, (t) => t.kind === "receita" && t.status !== "pago", "amountCents"),
      paidOutCents: sumBy(own, (t) => t.kind === "despesa" && t.status === "pago", "amountCents"),
      payableCents: sumBy(own, (t) => t.kind === "despesa" && t.status !== "pago", "amountCents"),
      overdueCents: own.filter((t) => isTransactionOverdue(t, referenceDate)).reduce((s, t) => s + t.amountCents, 0),
      transactionCount: own.length,
      lastCreatedAt:
        own.length > 0 ? own.reduce((latest, t) => (t.createdAt > latest ? t.createdAt : latest), own[0].createdAt) : null,
    };
  });
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
