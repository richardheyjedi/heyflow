"use client";

import { useMemo } from "react";
import { Wallet, ArrowDownCircle, ArrowUpCircle, TrendingUp, PiggyBank } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/taskflow/dashboard/metric-card";
import { CashFlowChart } from "@/components/finance/cash-flow-chart";
import { PaymentCutoffsPanel } from "@/components/finance/payment-cutoffs-panel";
import { MonthSettledBanner } from "@/components/finance/month-settled-banner";
import { DueAlertsPanel } from "@/components/finance/due-alerts-panel";
import { BalanceProjectionPanel } from "@/components/finance/balance-projection-panel";
import { GroupBreakdownPanel } from "@/components/finance/group-breakdown-panel";
import { BudgetManagerDialog } from "@/components/finance/budget-manager-dialog";
import {
  formatCurrencyBRL,
  getBudgetStatus,
  getCashFlowSeries,
  getMonthSettledStatus,
  getPaymentCutoffs,
  getTotals,
  getUpcomingDue,
  projectBalance,
} from "@/lib/finance/calculations";
import type { Budget, Category, Client, Transaction } from "@/lib/finance/types";

export function FinanceOverview({
  transactions,
  clients,
  categories,
  budgets,
}: {
  transactions: Transaction[];
  clients: Client[];
  categories: Category[];
  budgets: Budget[];
}) {
  const now = useMemo(() => new Date(), []);
  const totals = useMemo(() => getTotals(transactions), [transactions]);
  const cutoffs = useMemo(() => getPaymentCutoffs(transactions, now), [transactions, now]);
  const monthSettled = useMemo(() => getMonthSettledStatus(transactions, now), [transactions, now]);
  const cashFlowSeries = useMemo(() => getCashFlowSeries(transactions, 5, now), [transactions, now]);
  const dueAlerts = useMemo(() => getUpcomingDue(transactions, 7, now), [transactions, now]);
  const projection = useMemo(() => projectBalance(transactions, 3, now), [transactions, now]);
  const budgetStatus = useMemo(
    () => getBudgetStatus(transactions, categories, budgets, now),
    [transactions, categories, budgets, now]
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Saldo do mês" value={formatCurrencyBRL(totals.saldoMesCents)} icon={Wallet} accent="violet" />
        <MetricCard
          label="A receber"
          value={formatCurrencyBRL(totals.totalReceivableCents)}
          icon={ArrowUpCircle}
          accent="violet"
        />
        <MetricCard label="A pagar" value={formatCurrencyBRL(totals.totalPayableCents)} icon={ArrowDownCircle} accent="rose" />
        <MetricCard
          label="Resultado projetado"
          value={formatCurrencyBRL(totals.resultadoProjetadoCents)}
          icon={TrendingUp}
          accent="amber"
        />
      </div>

      <MonthSettledBanner status={monthSettled} />

      <div className="rounded-2xl border border-border/70 bg-card/60 p-5">
        <h2 className="text-sm font-semibold text-foreground">Cortes de pagamento</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Quanto você precisa ter disponível até cada corte, somando as despesas não pagas do mês.
        </p>
        <PaymentCutoffsPanel cutoffs={cutoffs} />
      </div>

      <div className="rounded-2xl border border-border/70 bg-card/60 p-5">
        <h2 className="text-sm font-semibold text-foreground">Fluxo de caixa</h2>
        <p className="mb-2 text-xs text-muted-foreground">Entradas x saídas realizadas por mês</p>
        <CashFlowChart data={cashFlowSeries} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Orçamento por grupo</h2>
            <BudgetManagerDialog
              budgets={budgets}
              trigger={
                <Button variant="ghost" size="icon-sm" title="Configurar orçamento">
                  <PiggyBank className="size-3.5" />
                </Button>
              }
            />
          </div>
          <p className="text-xs text-muted-foreground">Casa, pessoal, negócio e outros — no mês corrente.</p>
          <GroupBreakdownPanel status={budgetStatus} />
        </div>
        <div className="space-y-3 lg:col-span-1">
          <h2 className="text-sm font-semibold text-foreground">Vence nos próximos 7 dias</h2>
          <DueAlertsPanel alerts={dueAlerts} clients={clients} />
        </div>
        <div className="space-y-3 lg:col-span-1">
          <h2 className="text-sm font-semibold text-foreground">Projeção — próximos 3 meses</h2>
          <p className="text-xs text-muted-foreground">
            Considera lançamentos já cadastrados e as próximas ocorrências de recorrências.
          </p>
          <BalanceProjectionPanel projection={projection} />
        </div>
      </div>

      <p className="text-center text-[11px] text-muted-foreground/70">
        Referência: {format(now, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
      </p>
    </div>
  );
}
