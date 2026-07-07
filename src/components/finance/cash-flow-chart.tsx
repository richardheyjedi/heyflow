"use client";

// Wrapper lazy: recharts pesa ~100kb no bundle — carregar sob demanda tira o
// gráfico do JS inicial da página. O guard `mounted` garante que a PRIMEIRA
// renderização no cliente seja o skeleton (igual ao SSR): sem ele, se o chunk
// resolver durante a hidratação, o React encontra o gráfico onde o servidor
// mandou o skeleton e dispara hydration mismatch (#418).
import dynamic from "next/dynamic";
import { useHydrated } from "@/lib/use-hydrated";
import type { CashFlowPoint } from "@/lib/finance/calculations";

function ChartSkeleton() {
  return <div className="h-64 w-full animate-pulse rounded-xl bg-muted/30" />;
}

const CashFlowChartImpl = dynamic(
  () => import("./cash-flow-chart-impl").then((m) => m.CashFlowChart),
  { ssr: false, loading: ChartSkeleton }
);

export function CashFlowChart({ data }: { data: CashFlowPoint[] }) {
  const hydrated = useHydrated();
  if (!hydrated) return <ChartSkeleton />;
  return <CashFlowChartImpl data={data} />;
}
