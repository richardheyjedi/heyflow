import { test } from "node:test";
import assert from "node:assert/strict";
import {
  filterTransactions,
  formatCurrencyBRL,
  generateNextOccurrence,
  getBudgetStatus,
  getClientStats,
  getDRE,
  getExpenseBreakdownByGroup,
  getMonthSettledStatus,
  getPaymentCutoffs,
  getTotals,
  getUpcomingDue,
  isTransactionOverdue,
  projectBalance,
} from "@/lib/finance/calculations";
import { DEFAULT_FILTERS, type Budget, type Category, type Client, type Transaction } from "@/lib/finance/types";

const REFERENCE = new Date("2026-07-15T12:00:00.000Z");

function makeTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: overrides.id ?? "tx_test",
    kind: "despesa",
    scope: "PJ",
    description: "Teste",
    amountCents: 10000,
    category: "Outros",
    clientId: null,
    dueDate: "2026-07-10",
    paidAt: null,
    status: "nao_pago",
    recurrence: null,
    reminderId: null,
    originTransactionId: null,
    isGoon: false,
    createdAt: REFERENCE.toISOString(),
    updatedAt: REFERENCE.toISOString(),
    ...overrides,
  };
}

test("formatCurrencyBRL formata centavos em reais", () => {
  assert.equal(formatCurrencyBRL(123456), "R$ 1.234,56");
});

test("getPaymentCutoffs soma cumulativamente por corte", () => {
  const transactions = [
    makeTransaction({ id: "a", dueDate: "2026-07-03", amountCents: 10000 }),
    makeTransaction({ id: "b", dueDate: "2026-07-08", amountCents: 20000 }),
    makeTransaction({ id: "c", dueDate: "2026-07-22", amountCents: 30000 }),
    makeTransaction({ id: "d", dueDate: "2026-07-08", status: "pago", amountCents: 99999 }),
  ];

  const cutoffs = getPaymentCutoffs(transactions, REFERENCE);
  const day5 = cutoffs.find((c) => c.day === 5)!;
  const day10 = cutoffs.find((c) => c.day === 10)!;
  const day25 = cutoffs.find((c) => c.day === 25)!;

  assert.equal(day5.totalCents, 10000);
  assert.equal(day10.totalCents, 30000); // dia 3 + dia 8, exclui a paga
  assert.equal(day25.totalCents, 60000); // acumula tudo até o dia 25
});

test("getMonthSettledStatus indica mês quitado quando não há despesas pendentes", () => {
  const settled = getMonthSettledStatus(
    [makeTransaction({ dueDate: "2026-07-05", status: "pago" })],
    REFERENCE
  );
  assert.equal(settled.settled, true);
  assert.equal(settled.remainingCents, 0);

  const notSettled = getMonthSettledStatus(
    [
      makeTransaction({ dueDate: "2026-07-05", status: "pago" }),
      makeTransaction({ id: "b", dueDate: "2026-07-20", status: "nao_pago", amountCents: 5000 }),
    ],
    REFERENCE
  );
  assert.equal(notSettled.settled, false);
  assert.equal(notSettled.remainingCents, 5000);
  assert.equal(notSettled.remainingCount, 1);
});

test("getTotals calcula recebido/pago via paidAt e pendências separadamente", () => {
  const totals = getTotals([
    makeTransaction({ kind: "receita", status: "pago", amountCents: 100000 }),
    makeTransaction({ kind: "receita", status: "pendente", amountCents: 50000 }),
    makeTransaction({ kind: "despesa", status: "pago", amountCents: 30000 }),
    makeTransaction({ kind: "despesa", status: "nao_pago", amountCents: 20000 }),
  ]);

  assert.equal(totals.totalReceivedCents, 100000);
  assert.equal(totals.totalPaidCents, 30000);
  assert.equal(totals.totalReceivableCents, 50000);
  assert.equal(totals.totalPayableCents, 20000);
  assert.equal(totals.saldoMesCents, 70000);
  assert.equal(totals.resultadoProjetadoCents, 30000);
});

test("getUpcomingDue marca atrasados e ordena por vencimento", () => {
  const alerts = getUpcomingDue(
    [
      makeTransaction({ id: "atrasada", dueDate: "2026-07-10" }),
      makeTransaction({ id: "futura", dueDate: "2026-07-18" }),
      makeTransaction({ id: "fora-do-horizonte", dueDate: "2026-08-01" }),
    ],
    7,
    REFERENCE
  );

  assert.equal(alerts.length, 2);
  assert.equal(alerts[0].id, "atrasada");
  assert.equal(alerts[0].isOverdue, true);
  assert.equal(alerts[1].id, "futura");
  assert.equal(alerts[1].isOverdue, false);
});

test("generateNextOccurrence cria a próxima ocorrência mensal sem mutar a original", () => {
  const original = makeTransaction({
    dueDate: "2026-07-10",
    recurrence: { frequency: "mensal", interval: 1, nextDate: "2026-08-10" },
  });

  const next = generateNextOccurrence(original, () => "tx_next");

  assert.equal(next?.id, "tx_next");
  assert.equal(next?.dueDate, "2026-08-10");
  assert.equal(next?.status, "pendente");
  assert.equal(next?.recurrence?.nextDate, "2026-09-10");
  assert.equal(original.dueDate, "2026-07-10"); // original intacta
});

test("projectBalance projeta ocorrências futuras de recorrentes", () => {
  const transactions = [
    makeTransaction({
      kind: "receita",
      amountCents: 100000,
      dueDate: "2026-07-10",
      recurrence: { frequency: "mensal", interval: 1, nextDate: "2026-08-10" },
    }),
  ];

  const projection = projectBalance(transactions, 3, REFERENCE);
  assert.equal(projection.length, 3);
  assert.equal(projection[0].receitasCents, 100000); // agosto
  assert.equal(projection[1].receitasCents, 100000); // setembro (projetado)
});

test("getDRE agrupa despesas por categoria no mês", () => {
  const dre = getDRE(
    [
      makeTransaction({ kind: "receita", dueDate: "2026-07-05", amountCents: 200000 }),
      makeTransaction({ kind: "despesa", dueDate: "2026-07-05", category: "Aluguel", amountCents: 50000 }),
      makeTransaction({ kind: "despesa", dueDate: "2026-07-06", category: "Aluguel", amountCents: 10000 }),
      makeTransaction({ kind: "despesa", dueDate: "2026-07-07", category: "Impostos", amountCents: 30000 }),
    ],
    REFERENCE
  );

  assert.equal(dre.receitaTotalCents, 200000);
  assert.equal(dre.despesaTotalCents, 90000);
  assert.equal(dre.resultadoCents, 110000);
  assert.deepEqual(dre.despesasPorCategoria[0], { category: "Aluguel", totalCents: 60000 });
});

test("filterTransactions aplica período, status, cliente e escopo", () => {
  const transactions = [
    makeTransaction({ id: "a", dueDate: "2026-07-05", status: "pago", scope: "PJ", clientId: "c1" }),
    makeTransaction({ id: "b", dueDate: "2026-07-20", status: "nao_pago", scope: "PF", clientId: null }),
    makeTransaction({ id: "c", dueDate: "2026-08-05", status: "nao_pago", scope: "PJ", clientId: "c1" }),
  ];

  const currentMonth = filterTransactions(transactions, DEFAULT_FILTERS, REFERENCE);
  assert.equal(currentMonth.length, 2);

  const onlyPF = filterTransactions(transactions, { ...DEFAULT_FILTERS, scope: "PF" }, REFERENCE);
  assert.deepEqual(onlyPF.map((t) => t.id), ["b"]);

  const onlyClient = filterTransactions(transactions, { ...DEFAULT_FILTERS, clientId: "c1" }, REFERENCE);
  assert.deepEqual(onlyClient.map((t) => t.id), ["a"]);
});

test("filterTransactions filtra por grupo de categoria", () => {
  const categories: Category[] = [
    { id: "cat1", name: "Contas de Casa", group: "casa" },
    { id: "cat2", name: "Assinaturas", group: "outro" },
  ];
  const transactions = [
    makeTransaction({ id: "a", dueDate: "2026-07-05", category: "Contas de Casa" }),
    makeTransaction({ id: "b", dueDate: "2026-07-06", category: "Assinaturas" }),
  ];

  const onlyCasa = filterTransactions(transactions, { ...DEFAULT_FILTERS, categoryGroup: "casa" }, REFERENCE, categories);
  assert.deepEqual(onlyCasa.map((t) => t.id), ["a"]);
});

test("getExpenseBreakdownByGroup soma despesas do mês por grupo de categoria", () => {
  const categories: Category[] = [
    { id: "cat1", name: "Contas de Casa", group: "casa" },
    { id: "cat2", name: "Mercado", group: "casa" },
    { id: "cat3", name: "Serviços Prestados", group: "negocio" },
  ];
  const transactions = [
    makeTransaction({ id: "a", dueDate: "2026-07-05", category: "Contas de Casa", amountCents: 20000 }),
    makeTransaction({ id: "b", dueDate: "2026-07-06", category: "Mercado", amountCents: 15000 }),
    makeTransaction({ id: "c", dueDate: "2026-07-07", category: "Serviços Prestados", amountCents: 50000 }),
    makeTransaction({ id: "d", dueDate: "2026-08-01", category: "Mercado", amountCents: 99999 }), // fora do mês
  ];

  const breakdown = getExpenseBreakdownByGroup(transactions, categories, REFERENCE);
  assert.deepEqual(breakdown, [
    { group: "casa", totalCents: 35000 },
    { group: "negocio", totalCents: 50000 },
  ]);
});

test("isTransactionOverdue considera vencido e não pago, ignora o dia atual", () => {
  assert.equal(isTransactionOverdue(makeTransaction({ dueDate: "2026-07-10", status: "nao_pago" }), REFERENCE), true);
  assert.equal(isTransactionOverdue(makeTransaction({ dueDate: "2026-07-15", status: "nao_pago" }), REFERENCE), false);
  assert.equal(isTransactionOverdue(makeTransaction({ dueDate: "2026-07-10", status: "pago" }), REFERENCE), false);
  assert.equal(isTransactionOverdue(makeTransaction({ dueDate: "2026-07-20", status: "nao_pago" }), REFERENCE), false);
});

test("filterTransactions com status atrasado ignora o período e traz vencidos de qualquer mês", () => {
  const transactions = [
    makeTransaction({ id: "mes-passado", dueDate: "2026-05-01", status: "nao_pago" }),
    makeTransaction({ id: "atrasada-mes-atual", dueDate: "2026-07-10", status: "pendente" }),
    makeTransaction({ id: "paga-atrasada", dueDate: "2026-07-01", status: "pago" }),
    makeTransaction({ id: "futura", dueDate: "2026-07-20", status: "nao_pago" }),
  ];

  const overdue = filterTransactions(transactions, { ...DEFAULT_FILTERS, status: "atrasado" }, REFERENCE);
  assert.deepEqual(
    overdue.map((t) => t.id).sort(),
    ["atrasada-mes-atual", "mes-passado"]
  );
});

test("getClientStats agrega recebido, a receber e atrasado por cliente", () => {
  const clients: Client[] = [{ id: "c1", name: "Cliente A", color: "#000", kind: "PJ" }];
  const transactions = [
    makeTransaction({
      id: "a",
      clientId: "c1",
      kind: "receita",
      status: "pago",
      amountCents: 50000,
      dueDate: "2026-07-05",
      createdAt: "2026-06-01T00:00:00.000Z",
    }),
    makeTransaction({
      id: "b",
      clientId: "c1",
      kind: "receita",
      status: "pendente",
      amountCents: 20000,
      dueDate: "2026-07-20",
      createdAt: "2026-06-10T00:00:00.000Z",
    }),
    makeTransaction({
      id: "c",
      clientId: "c1",
      kind: "receita",
      status: "nao_pago",
      amountCents: 10000,
      dueDate: "2026-07-01",
      // Vencimento mais distante que "b", mas criado ANTES — não deve contar como "último lançamento".
      createdAt: "2026-06-05T00:00:00.000Z",
    }),
    makeTransaction({ id: "d", clientId: null, kind: "receita", status: "pago", amountCents: 99999, dueDate: "2026-07-05" }),
  ];

  const [stats] = getClientStats(transactions, clients, REFERENCE);
  assert.equal(stats.receivedCents, 50000);
  assert.equal(stats.receivableCents, 30000);
  assert.equal(stats.overdueCents, 10000);
  assert.equal(stats.transactionCount, 3);
  assert.equal(stats.lastCreatedAt, "2026-06-10T00:00:00.000Z");
});

test("getBudgetStatus compara gasto do mês com o limite por grupo", () => {
  const categories: Category[] = [{ id: "cat1", name: "Contas de Casa", group: "casa" }];
  const budgets: Budget[] = [{ id: "b1", group: "casa", limitCents: 30000 }];

  const withinBudget = getBudgetStatus(
    [makeTransaction({ dueDate: "2026-07-05", category: "Contas de Casa", amountCents: 20000 })],
    categories,
    budgets,
    REFERENCE
  );
  assert.deepEqual(withinBudget, [
    { group: "casa", spentCents: 20000, limitCents: 30000, percentage: 67, isOverBudget: false },
  ]);

  const overBudget = getBudgetStatus(
    [makeTransaction({ dueDate: "2026-07-05", category: "Contas de Casa", amountCents: 45000 })],
    categories,
    budgets,
    REFERENCE
  );
  assert.equal(overBudget[0].isOverBudget, true);
  assert.equal(overBudget[0].percentage, 150);
});
