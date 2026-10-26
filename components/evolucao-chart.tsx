"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Item = { mes: string; faturamento: number; gasto: number };

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function EvolucaoChart({ data }: { data: Item[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Sem dados suficientes ainda.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: 8, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="mes" fontSize={12} tickLine={false} className="capitalize" />
        <YAxis fontSize={12} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="faturamento" name="Faturamento" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="gasto" name="Gasto" fill="var(--color-chart-3)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
