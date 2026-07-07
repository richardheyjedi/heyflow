"use client";

// Wrapper lazy: recharts pesa ~100kb no bundle — carregar sob demanda tira o
// gráfico do JS inicial da página. O guard `mounted` garante que a PRIMEIRA
// renderização no cliente seja o skeleton (igual ao SSR): sem ele, se o chunk
// resolver durante a hidratação, o React encontra o gráfico onde o servidor
// mandou o skeleton e dispara hydration mismatch (#418).
import dynamic from "next/dynamic";
import { useHydrated } from "@/lib/use-hydrated";

type Slice = { name: string; value: number; color: string };

function ChartSkeleton() {
  return <div className="size-44 animate-pulse rounded-full bg-muted/30" />;
}

const ProjectDistributionChartImpl = dynamic(
  () => import("./project-distribution-chart-impl").then((m) => m.ProjectDistributionChart),
  { ssr: false, loading: ChartSkeleton }
);

export function ProjectDistributionChart({ data }: { data: Slice[] }) {
  const hydrated = useHydrated();
  if (!hydrated) return <ChartSkeleton />;
  return <ProjectDistributionChartImpl data={data} />;
}
