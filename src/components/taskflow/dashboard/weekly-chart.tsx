"use client";

// Wrapper lazy: recharts pesa ~100kb no bundle — carregar sob demanda tira o
// gráfico do JS inicial da página. O guard `mounted` garante que a PRIMEIRA
// renderização no cliente seja o skeleton (igual ao SSR): sem ele, se o chunk
// resolver durante a hidratação, o React encontra o gráfico onde o servidor
// mandou o skeleton e dispara hydration mismatch (#418).
import dynamic from "next/dynamic";
import { useHydrated } from "@/lib/use-hydrated";

type WeeklyPoint = { label: string; completed: number; total: number };

function ChartSkeleton() {
  return <div className="h-64 w-full animate-pulse rounded-xl bg-muted/30" />;
}

const WeeklyChartImpl = dynamic(
  () => import("./weekly-chart-impl").then((m) => m.WeeklyChart),
  { ssr: false, loading: ChartSkeleton }
);

export function WeeklyChart({ data }: { data: WeeklyPoint[] }) {
  const hydrated = useHydrated();
  if (!hydrated) return <ChartSkeleton />;
  return <WeeklyChartImpl data={data} />;
}
