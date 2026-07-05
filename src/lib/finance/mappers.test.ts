import { test } from "node:test";
import assert from "node:assert/strict";
import { toDomainTransaction } from "@/lib/finance/mappers";

// Datas de vencimento são gravadas como meia-noite UTC (new Date("yyyy-MM-dd")
// em actions.ts). Ler de volta com funções sensíveis a fuso horário local
// (ex.: date-fns#format) devolve o dia anterior em qualquer timezone negativo
// (ex.: Brasil, UTC-3) — ver formatDateOnly em mappers.ts.
test("toDomainTransaction preserva a data de vencimento independente do fuso horário local", () => {
  const row = {
    id: "tx1",
    kind: "despesa" as const,
    scope: "PF" as const,
    description: "Teste",
    amountCents: 1000,
    category: "Outros",
    clientId: null,
    dueDate: new Date("2026-07-01"), // meia-noite UTC
    paidAt: null,
    status: "pendente" as const,
    recurrenceFrequency: null,
    recurrenceInterval: null,
    recurrenceNextDate: null,
    originTransactionId: null,
    isGoon: false,
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-01T00:00:00.000Z"),
  };

  const transaction = toDomainTransaction(row);
  assert.equal(transaction.dueDate, "2026-07-01");
});

test("toDomainTransaction preserva paidAt e a próxima ocorrência da recorrência", () => {
  const row = {
    id: "tx2",
    kind: "receita" as const,
    scope: "PJ" as const,
    description: "Teste",
    amountCents: 2000,
    category: "Outros",
    clientId: null,
    dueDate: new Date("2026-07-01"),
    paidAt: new Date("2026-06-30"),
    status: "pago" as const,
    recurrenceFrequency: "mensal" as const,
    recurrenceInterval: 1,
    recurrenceNextDate: new Date("2026-08-01"),
    originTransactionId: null,
    isGoon: false,
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-01T00:00:00.000Z"),
  };

  const transaction = toDomainTransaction(row);
  assert.equal(transaction.paidAt, "2026-06-30");
  assert.equal(transaction.recurrence?.nextDate, "2026-08-01");
});
