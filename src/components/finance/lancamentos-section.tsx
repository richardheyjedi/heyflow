"use client";

import { useMemo } from "react";
import { TransactionKindTab } from "@/components/finance/transaction-kind-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Category, Client, Transaction } from "@/lib/finance/types";

/**
 * Lançamentos, com recebimentos e despesas separados em sub-abas.
 * Cobre só o financeiro principal (isGoon = false) — lançamentos do antigo
 * ledger GOON continuam no banco, mas não têm mais aba própria.
 */
export function LancamentosSection({
  transactions,
  clients,
  categories,
  todayISO,
}: {
  transactions: Transaction[];
  clients: Client[];
  categories: Category[];
  todayISO: string;
}) {
  const mainTransactions = useMemo(() => transactions.filter((t) => !t.isGoon), [transactions]);

  return (
    <Tabs defaultValue="recebimentos">
      <TabsList variant="line">
        <TabsTrigger value="recebimentos">Recebimentos</TabsTrigger>
        <TabsTrigger value="despesas">Despesas</TabsTrigger>
      </TabsList>
      <TabsContent value="recebimentos" className="mt-4">
        <TransactionKindTab kind="receita" transactions={mainTransactions} clients={clients} categories={categories} todayISO={todayISO} />
      </TabsContent>
      <TabsContent value="despesas" className="mt-4">
        <TransactionKindTab kind="despesa" transactions={mainTransactions} clients={clients} categories={categories} todayISO={todayISO} />
      </TabsContent>
    </Tabs>
  );
}
