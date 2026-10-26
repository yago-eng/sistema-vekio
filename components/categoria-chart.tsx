"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Item = { categoriaNome: string; total: number };

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function CategoriaChart({ data }: { data: Item[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhum gasto lançado ainda.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ left: 8, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="categoriaNome" fontSize={12} tickLine={false} />
        <YAxis fontSize={12} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
        <Bar dataKey="total" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
