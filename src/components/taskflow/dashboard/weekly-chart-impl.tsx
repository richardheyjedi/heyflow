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
              <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c4b5fd" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#c4b5fd" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#ebebeb" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6a6a6a", fontSize: 12 }}
          />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6a6a6a", fontSize: 12 }} allowDecimals={false} />
          <Tooltip
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
          <Area
            type="monotone"
            dataKey="total"
            stroke="#c4b5fd"
            strokeWidth={2}
            fill="url(#totalGradient)"
            name="Previstas"
          />
          <Area
            type="monotone"
            dataKey="completed"
            stroke="#7c3aed"
            strokeWidth={2.5}
            fill="url(#completedGradient)"
            name="Concluídas"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
