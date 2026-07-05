// Tipos de domínio do módulo Financeiro.
//
// Estes tipos são a "forma" usada por toda a UI e por calculations.ts.
// Os dados vêm do Prisma (models FinanceTransaction/FinanceClient/FinanceCategory/
// FinanceReminder em prisma/schema.prisma) e são convertidos para este formato
// em src/lib/finance/mappers.ts — recorrência, por exemplo, é achatada em
// colunas simples no banco (recurrenceFrequency/Interval/NextDate) e remontada
// aqui como o objeto aninhado `RecurrenceRule`. Leituras ficam em
// src/lib/finance/data.ts, mutações em src/lib/finance/actions.ts.
// `Reminder.taskId` referencia o id real de uma Task do TaskFlow, criada via a
// Server Action `createTask` existente (ver `scheduleFinanceReminder`).

export type TransactionKind = "receita" | "despesa";

export type OwnerScope = "PF" | "PJ";

export type TransactionStatus = "pago" | "nao_pago" | "pendente";

export type RecurrenceFrequency = "semanal" | "quinzenal" | "mensal" | "anual";

export type RecurrenceRule = {
  frequency: RecurrenceFrequency;
  /** A cada quantas unidades da frequência a recorrência se repete (1 = toda vez). */
  interval: number;
  /** ISO yyyy-MM-dd — data em que a próxima ocorrência deve ser gerada. */
  nextDate: string;
};

/** Empresa, cliente ou fornecedor — quem paga uma receita ou para quem se paga uma despesa. */
export type Client = {
  id: string;
  name: string;
  color: string;
  kind: OwnerScope;
};

/**
 * Lembrete de cobrança vinculado a um lançamento. Quando `taskId` está
 * preenchido, existe uma Task real criada no TaskFlow (via Server Action
 * `createTask`) para esse lembrete.
 */
export type Reminder = {
  id: string;
  transactionId: string;
  taskId: string | null;
  date: string; // ISO yyyy-MM-dd
  message: string;
  createdAt: string;
};

export type Transaction = {
  id: string;
  kind: TransactionKind;
  scope: OwnerScope;
  description: string;
  /** Valor em centavos (evita erros de ponto flutuante). */
  amountCents: number;
  category: string;
  clientId: string | null;
  dueDate: string; // ISO yyyy-MM-dd
  paidAt: string | null; // ISO yyyy-MM-dd
  status: TransactionStatus;
  recurrence: RecurrenceRule | null;
  reminderId: string | null;
  /** Se esta transação foi gerada automaticamente a partir de uma recorrente. */
  originTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PeriodFilter = "current_month" | "next_30_days" | "custom";

export type TransactionFilters = {
  period: PeriodFilter;
  customStart?: string;
  customEnd?: string;
  status: TransactionStatus | "all";
  clientId: string | "all";
  scope: OwnerScope | "all";
};

export const DEFAULT_FILTERS: TransactionFilters = {
  period: "current_month",
  status: "all",
  clientId: "all",
  scope: "all",
};

export const CATEGORY_LABELS_SEED = [
  "Aluguel",
  "Impostos",
  "Fornecedores",
  "Assinaturas",
  "Alimentação",
  "Serviços prestados",
  "Salários",
  "Transporte",
  "Outros",
];

export const PAYMENT_CUTOFF_DAYS = [5, 10, 15, 20, 25] as const;
