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
 * Agrupamento de categorias: "casa" cobre contas domésticas (água, luz,
 * aluguel, mercado...), "pessoal" gastos individuais fora de casa, "negocio"
 * o lado PJ/trabalho, e "outro" o que não se encaixa nos demais.
 */
export type CategoryGroup = "casa" | "pessoal" | "negocio" | "outro";

export const CATEGORY_GROUP_LABEL: Record<CategoryGroup, string> = {
  casa: "Casa",
  pessoal: "Pessoal",
  negocio: "Negócio",
  outro: "Outro",
};

export type Category = {
  id: string;
  name: string;
  group: CategoryGroup;
};

/** Limite mensal de gasto para um grupo de categorias (ex.: Casa até R$1.200). */
export type Budget = {
  id: string;
  group: CategoryGroup;
  limitCents: number;
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
  /** Parcelamento (despesas): quantas parcelas, incluindo esta, ainda restam. */
  installmentsRemaining: number | null;
  reminderId: string | null;
  /** Se esta transação foi gerada automaticamente a partir de uma recorrente. */
  originTransactionId: string | null;
  /** Lançamento do ledger GOON — isolado do financeiro principal (Visão Geral, DRE, Clientes, Recebimentos/Despesas/Tudo). */
  isGoon: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PeriodFilter = "current_month" | "next_30_days" | "custom";

export type TransactionFilters = {
  period: PeriodFilter;
  customStart?: string;
  customEnd?: string;
  /** "atrasado" é um filtro derivado (vencido e não pago) que ignora o período selecionado. */
  status: TransactionStatus | "all" | "atrasado";
  clientId: string | "all";
  scope: OwnerScope | "all";
  categoryGroup: CategoryGroup | "all";
};

export const DEFAULT_FILTERS: TransactionFilters = {
  period: "current_month",
  status: "all",
  clientId: "all",
  scope: "all",
  categoryGroup: "all",
};

export const PAYMENT_CUTOFF_DAYS = [5, 10, 15, 20, 25] as const;
