"use client";

// Wrapper lazy: recharts pesa ~100kb no bundle — carregar sob demanda tira o
// gráfico do JS inicial da página. O skeleton espelha o tamanho do donut
// (h-44 w-44) para não causar layout shift.
import dynamic from "next/dynamic";

export const ProjectDistributionChart = dynamic(
  () => import("./project-distribution-chart-impl").then((m) => m.ProjectDistributionChart),
  {
    ssr: false,
    loading: () => <div className="size-44 animate-pulse rounded-full bg-muted/30" />,
  }
);
