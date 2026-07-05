"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CashFlowPoint } from "@/lib/finance/calculations";

export function CashFlowChart({ data }: { data: CashFlowPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#9891A8", fontSize: 12 }} />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#9891A8", fontSize: 12 }}
            tickFormatter={(v: number) => `R$${Math.round(v / 1000)}k`}
          />
          <Tooltip
            formatter={(value) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            contentStyle={{
              background: "#161320",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              fontSize: 12,
              color: "#F3F1F8",
            }}
            labelStyle={{ color: "#9891A8" }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#9891A8" }} />
          <Bar dataKey="entradas" name="Entradas" fill="#A855F7" radius={[6, 6, 0, 0]} />
          <Bar dataKey="saidas" name="Saídas" fill="#FB7185" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
