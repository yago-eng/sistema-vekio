"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Tarefa } from "@/lib/types";

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const PESO_PRIORIDADE: Record<string, number> = { urgente: 0, alta: 1, normal: 2, baixa: 3 };
const CHIPS_POR_DIA = 3;

function classeDaTarefa(t: Tarefa, hoje: string) {
  if (t.status === "concluida") return "bg-muted text-muted-foreground line-through";
  if (t.prazo && t.prazo < hoje) return "bg-red-100 text-red-700";
  if (t.status === "fazendo") return "bg-sky-100 text-sky-700";
  return "bg-primary/10 text-foreground";
}

function ordenar(lista: Tarefa[]) {
  return [...lista].sort(
    (a, b) =>
      Number(a.status === "concluida") - Number(b.status === "concluida") ||
      PESO_PRIORIDADE[a.prioridade] - PESO_PRIORIDADE[b.prioridade] ||
      a.titulo.localeCompare(b.titulo)
  );
}

export function TarefasCalendario({
  tarefas,
  hoje,
  onAbrir,
}: {
  tarefas: Tarefa[];
  hoje: string;
  onAbrir: (id: string) => void;
}) {
  const [mes, setMes] = useState(hoje.slice(0, 7)); // AAAA-MM
  const [diaSel, setDiaSel] = useState<string | null>(null);

  const [ano, numMes] = mes.split("-").map(Number);
  const primeiroDiaSemana = new Date(Date.UTC(ano, numMes - 1, 1)).getUTCDay();
  const diasNoMes = new Date(Date.UTC(ano, numMes, 0)).getUTCDate();
  const titulo = new Date(Date.UTC(ano, numMes - 1, 1)).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const porDia = useMemo(() => {
    const mapa = new Map<string, Tarefa[]>();
    for (const t of tarefas) {
      if (!t.prazo) continue;
      mapa.set(t.prazo, [...(mapa.get(t.prazo) ?? []), t]);
    }
    for (const [dia, lista] of mapa) mapa.set(dia, ordenar(lista));
    return mapa;
  }, [tarefas]);

  const semPrazo = useMemo(() => ordenar(tarefas.filter((t) => !t.prazo && t.status !== "concluida")), [tarefas]);

  function irParaMes(delta: number) {
    const d = new Date(Date.UTC(ano, numMes - 1 + delta, 1));
    setMes(d.toISOString().slice(0, 7));
    setDiaSel(null);
  }

  const celulas: (string | null)[] = [
    ...Array.from({ length: primeiroDiaSemana }, () => null),
    ...Array.from({ length: diasNoMes }, (_, i) => `${mes}-${String(i + 1).padStart(2, "0")}`),
  ];
  const selecionadas = diaSel ? (porDia.get(diaSel) ?? []) : [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="icon-sm" aria-label="Mês anterior" onClick={() => irParaMes(-1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <Button type="button" variant="outline" size="icon-sm" aria-label="Próximo mês" onClick={() => irParaMes(1)}>
          <ChevronRight className="size-4" />
        </Button>
        <h3 className="text-sm font-semibold capitalize">{titulo}</h3>
        {mes !== hoje.slice(0, 7) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setMes(hoje.slice(0, 7));
              setDiaSel(hoje);
            }}
          >
            Hoje
          </Button>
        )}
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border text-xs">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="bg-muted/60 px-1 py-1.5 text-center font-medium text-muted-foreground uppercase">
            {d}
          </div>
        ))}
        {celulas.map((dia, i) => {
          if (!dia) return <div key={`v${i}`} className="min-h-16 bg-background sm:min-h-28" />;
          const lista = porDia.get(dia) ?? [];
          const ehHoje = dia === hoje;
          const atrasadas = lista.filter((t) => t.status !== "concluida" && dia < hoje).length;
          return (
            <div
              key={dia}
              role="button"
              tabIndex={0}
              onClick={() => setDiaSel(dia === diaSel ? null : dia)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setDiaSel(dia === diaSel ? null : dia);
                }
              }}
              className={cn(
                "flex min-h-16 cursor-pointer flex-col gap-1 bg-background p-1 text-left hover:bg-muted/40 sm:min-h-28",
                dia === diaSel && "bg-primary/5 ring-2 ring-primary/40 ring-inset"
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs",
                  ehHoje && "bg-primary font-semibold text-primary-foreground"
                )}
              >
                {Number(dia.slice(8))}
              </span>

              {lista.length > 0 && (
                <span
                  className={cn(
                    "w-fit rounded-full px-1.5 text-[10px] font-medium sm:hidden",
                    atrasadas > 0 ? "bg-red-100 text-red-700" : "bg-primary/10"
                  )}
                >
                  {lista.length}
                </span>
              )}

              <div className="hidden flex-col gap-1 sm:flex">
                {lista.slice(0, CHIPS_POR_DIA).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    title={t.titulo}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAbrir(t.id);
                    }}
                    className={cn("truncate rounded px-1.5 py-0.5 text-left hover:opacity-80", classeDaTarefa(t, hoje))}
                  >
                    {t.titulo}
                  </button>
                ))}
                {lista.length > CHIPS_POR_DIA && (
                  <span className="px-1 text-[11px] text-muted-foreground">+{lista.length - CHIPS_POR_DIA} mais</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {diaSel && (
        <section className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold">
            {diaSel.split("-").reverse().join("/")}
            <span className="ml-2 font-normal text-muted-foreground">
              ({selecionadas.length} tarefa{selecionadas.length !== 1 ? "s" : ""})
            </span>
          </h4>
          {selecionadas.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma tarefa neste dia.</p>}
          {selecionadas.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onAbrir(t.id)}
              className={cn("rounded-lg px-3 py-2 text-left text-sm hover:opacity-80", classeDaTarefa(t, hoje))}
            >
              {t.titulo}
              {t.responsaveis.length > 0 && (
                <span className="ml-2 text-xs opacity-70">{t.responsaveis.map((r) => r.nome).join(", ")}</span>
              )}
            </button>
          ))}
        </section>
      )}

      {semPrazo.length > 0 && (
        <section className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold">
            Sem prazo <span className="font-normal text-muted-foreground">({semPrazo.length})</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {semPrazo.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onAbrir(t.id)}
                className={cn("rounded px-2 py-1 text-xs hover:opacity-80", classeDaTarefa(t, hoje))}
              >
                {t.titulo}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
