"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type WeeklyPoint = { label: string; completed: number; total: number };

export function WeeklyChart({ data }: { data: WeeklyPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A855F7" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#A855F7" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4C1D95" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#4C1D95" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#9891A8", fontSize: 12 }}
          />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9891A8", fontSize: 12 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "#161320",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              fontSize: 12,
              color: "#F3F1F8",
            }}
            labelStyle={{ color: "#9891A8" }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#4C1D95"
            strokeWidth={2}
            fill="url(#totalGradient)"
            name="Previstas"
          />
          <Area
            type="monotone"
            dataKey="completed"
            stroke="#A855F7"
            strokeWidth={2.5}
            fill="url(#completedGradient)"
            name="Concluídas"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
