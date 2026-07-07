"use client";

// Wrapper lazy: recharts pesa ~100kb no bundle — carregar sob demanda tira o
// gráfico do JS inicial da página. O skeleton tem a mesma altura do gráfico
// (h-64) para não causar layout shift.
import dynamic from "next/dynamic";

export const CashFlowChart = dynamic(
  () => import("./cash-flow-chart-impl").then((m) => m.CashFlowChart),
  {
    ssr: false,
    loading: () => <div className="h-64 w-full animate-pulse rounded-xl bg-muted/30" />,
  }
);
