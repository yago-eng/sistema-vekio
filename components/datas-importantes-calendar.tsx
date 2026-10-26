"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DataImportante } from "@/lib/types";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function noMes(dataIso: string, ano: number, mes: number) {
  const [y, m] = dataIso.split("-").map(Number);
  return y === ano && m - 1 === mes;
}

export function DatasImportantesCalendar({ datas }: { datas: DataImportante[] }) {
  const hoje = new Date();
  const hojeIso = hoje.toISOString().slice(0, 10);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());

  const porDia = new Map<number, DataImportante[]>();
  for (const d of datas) {
    if (noMes(d.data, ano, mes)) {
      const dia = Number(d.data.slice(8, 10));
      if (!porDia.has(dia)) porDia.set(dia, []);
      porDia.get(dia)!.push(d);
    }
  }

  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  const celulas: (number | null)[] = [];
  for (let i = 0; i < primeiroDia; i++) celulas.push(null);
  for (let d = 1; d <= diasNoMes; d++) celulas.push(d);

  function navegar(delta: number) {
    const novo = new Date(ano, mes + delta, 1);
    setAno(novo.getFullYear());
    setMes(novo.getMonth());
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => navegar(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-40 text-center font-medium">
            {MESES[mes]} {ano}
          </span>
          <Button variant="outline" size="icon-sm" onClick={() => navegar(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="py-1 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
        {celulas.map((dia, idx) => {
          if (dia === null) return <div key={`empty-${idx}`} className="min-h-24" />;
          const doDia = porDia.get(dia) ?? [];
          const ehHoje =
            dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear();
          const diaIso = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
          const passou = diaIso < hojeIso;
          return (
            <div
              key={dia}
              className={`min-h-24 rounded-md border p-1 ${ehHoje ? "border-primary bg-primary/5" : "bg-card"}`}
            >
              <div className="mb-1 text-xs font-medium text-muted-foreground">{dia}</div>
              <div className="flex flex-col gap-1">
                {doDia.map((d) => (
                  <div
                    key={d.id}
                    className={`block truncate rounded px-1 py-0.5 text-[10px] leading-tight font-medium ${
                      passou ? "bg-muted text-muted-foreground" : "bg-primary/10 text-foreground"
                    }`}
                    title={`${d.titulo}${d.descricao ? " · " + d.descricao : ""}`}
                  >
                    {d.titulo}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {datas.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Nenhuma data importante cadastrada ainda.
        </p>
      )}
    </div>
  );
}
