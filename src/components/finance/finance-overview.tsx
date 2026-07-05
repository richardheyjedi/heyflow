"use client";

import { useMemo } from "react";
import { Wallet, ArrowDownCircle, ArrowUpCircle, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MetricCard } from "@/components/taskflow/dashboard/metric-card";
import { CashFlowChart } from "@/components/finance/cash-flow-chart";
import { PaymentCutoffsPanel } from "@/components/finance/payment-cutoffs-panel";
import { MonthSettledBanner } from "@/components/finance/month-settled-banner";
import { DueAlertsPanel } from "@/components/finance/due-alerts-panel";
import { BalanceProjectionPanel } from "@/components/finance/balance-projection-panel";
import {
  formatCurrencyBRL,
  getCashFlowSeries,
  getMonthSettledStatus,
  getPaymentCutoffs,
  getTotals,
  getUpcomingDue,
  projectBalance,
} from "@/lib/finance/calculations";
import type { Client, Transaction } from "@/lib/finance/types";

export function FinanceOverview({ transactions, clients }: { transactions: Transaction[]; clients: Client[] }) {
  const now = useMemo(() => new Date(), []);
  const totals = useMemo(() => getTotals(transactions), [transactions]);
  const cutoffs = useMemo(() => getPaymentCutoffs(transactions, now), [transactions, now]);
  const monthSettled = useMemo(() => getMonthSettledStatus(transactions, now), [transactions, now]);
  const cashFlowSeries = useMemo(() => getCashFlowSeries(transactions, 5, now), [transactions, now]);
  const dueAlerts = useMemo(() => getUpcomingDue(transactions, 7, now), [transactions, now]);
  const projection = useMemo(() => projectBalance(transactions, 3, now), [transactions, now]);

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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Vence nos próximos 7 dias</h2>
          <DueAlertsPanel alerts={dueAlerts} clients={clients} />
        </div>
        <div className="space-y-3">
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
