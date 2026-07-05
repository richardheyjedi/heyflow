import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { toDomainBudget, toDomainCategory, toDomainClient, toDomainTransaction } from "@/lib/finance/mappers";

export const financeTransactionInclude = {
  reminder: true,
} satisfies Prisma.FinanceTransactionInclude;

export async function getFinanceTransactions() {
  const rows = await prisma.financeTransaction.findMany({
    include: financeTransactionInclude,
    orderBy: { dueDate: "asc" },
  });
  return rows.map(toDomainTransaction);
}

export async function getFinanceClients() {
  const rows = await prisma.financeClient.findMany({ orderBy: { name: "asc" } });
  return rows.map(toDomainClient);
}

export async function getFinanceCategories() {
  const rows = await prisma.financeCategory.findMany({ orderBy: { name: "asc" } });
  return rows.map(toDomainCategory);
}

export async function getFinanceBudgets() {
  const rows = await prisma.financeBudget.findMany();
  return rows.map(toDomainBudget);
}
