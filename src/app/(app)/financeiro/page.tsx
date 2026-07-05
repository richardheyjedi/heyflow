import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinanceOverview } from "@/components/finance/finance-overview";
import { LancamentosSection } from "@/components/finance/lancamentos-section";
import { ClientsTab } from "@/components/finance/clients-tab";
import { DreTab } from "@/components/finance/dre-tab";
import { getFinanceBudgets, getFinanceCategories, getFinanceClients, getFinanceTransactions } from "@/lib/finance/data";

// Página do módulo Financeiro. Os dados vêm do Prisma (ver src/lib/finance/data.ts)
// e as mutações são Server Actions (src/lib/finance/actions.ts) — mesmo padrão
// usado no resto do TaskFlow. `dynamic = "force-dynamic"` já está definido no
// layout de (app) e cobre esta rota também.
export default async function FinanceiroPage() {
  const [transactions, clients, categories, budgets] = await Promise.all([
    getFinanceTransactions(),
    getFinanceClients(),
    getFinanceCategories(),
    getFinanceBudgets(),
  ]);
  // GOON é um ledger isolado — nunca deve entrar nos totais do financeiro principal.
  const mainTransactions = transactions.filter((t) => !t.isGoon);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Financeiro</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fluxo de caixa, cobranças e contas — pessoa física e jurídica em um só lugar.
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="transactions">Lançamentos</TabsTrigger>
          <TabsTrigger value="clients">Clientes</TabsTrigger>
          <TabsTrigger value="dre">DRE</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <FinanceOverview transactions={mainTransactions} clients={clients} categories={categories} budgets={budgets} />
        </TabsContent>
        <TabsContent value="transactions" className="mt-4">
          <LancamentosSection transactions={transactions} clients={clients} categories={categories} />
        </TabsContent>
        <TabsContent value="clients" className="mt-4">
          <ClientsTab transactions={mainTransactions} clients={clients} />
        </TabsContent>
        <TabsContent value="dre" className="mt-4">
          <DreTab transactions={mainTransactions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
