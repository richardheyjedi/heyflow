"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CashFlowPoint } from "@/lib/finance/calculations";

export function CashFlowChart({ data }: { data: CashFlowPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#ebebeb" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#6a6a6a", fontSize: 12 }} />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6a6a6a", fontSize: 12 }}
            tickFormatter={(v: number) => `R$${Math.round(v / 1000)}k`}
          />
          <Tooltip
            formatter={(value) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #dddddd",
              borderRadius: 12,
              fontSize: 12,
              color: "#222222",
              boxShadow: "rgba(0,0,0,0.04) 0 2px 6px 0, rgba(0,0,0,0.1) 0 4px 8px 0",
            }}
            labelStyle={{ color: "#6a6a6a" }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#6a6a6a" }} />
          <Bar dataKey="entradas" name="Entradas" fill="#7c3aed" radius={[6, 6, 0, 0]} />
          <Bar dataKey="saidas" name="Saídas" fill="#e11d48" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
