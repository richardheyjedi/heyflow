"use client";

import { useMemo } from "react";
import { TransactionsTab } from "@/components/finance/transactions-tab";
import { TransactionKindTab } from "@/components/finance/transaction-kind-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Category, Client, Transaction } from "@/lib/finance/types";

/**
 * Lançamentos, com recebimentos e despesas separados em sub-abas.
 * "Recebimentos" e "Despesas" cobrem só o financeiro principal (isGoon = false).
 * "GOON" é um ledger isolado (isGoon = true) — nunca soma nos totais/DRE/Clientes
 * do financeiro principal, mesmo tendo receitas e despesas próprias.
 */
export function LancamentosSection({
  transactions,
  clients,
  categories,
}: {
  transactions: Transaction[];
  clients: Client[];
  categories: Category[];
}) {
  const mainTransactions = useMemo(() => transactions.filter((t) => !t.isGoon), [transactions]);
  const goonTransactions = useMemo(() => transactions.filter((t) => t.isGoon), [transactions]);

  return (
    <Tabs defaultValue="recebimentos">
      <TabsList variant="line">
        <TabsTrigger value="recebimentos">Recebimentos</TabsTrigger>
        <TabsTrigger value="despesas">Despesas</TabsTrigger>
        <TabsTrigger value="goon">GOON</TabsTrigger>
      </TabsList>
      <TabsContent value="recebimentos" className="mt-4">
        <TransactionKindTab kind="receita" transactions={mainTransactions} clients={clients} categories={categories} />
      </TabsContent>
      <TabsContent value="despesas" className="mt-4">
        <TransactionKindTab kind="despesa" transactions={mainTransactions} clients={clients} categories={categories} />
      </TabsContent>
      <TabsContent value="goon" className="mt-4">
        <TransactionsTab
          transactions={goonTransactions}
          clients={clients}
          categories={categories}
          defaults={{ isGoon: true }}
        />
      </TabsContent>
    </Tabs>
  );
}
