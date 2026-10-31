"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { mudarStatusTarefaAction } from "@/lib/tarefa-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { COR_PRIORIDADE, formatarPrazo } from "@/components/tarefa-detalhe-dialog";
import { ArrowRight, CheckSquare } from "lucide-react";
import { TAREFA_PRIORIDADES, type Tarefa } from "@/lib/types";

export function MinhasTarefasHoje({ tarefas, hoje, total }: { tarefas: Tarefa[]; hoje: string; total: number }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [concluidas, setConcluidas] = useState<string[]>([]);

  const visiveis = tarefas.filter((t) => !concluidas.includes(t.id));
  const atrasadas = visiveis.filter((t) => t.prazo && t.prazo < hoje).length;
  const deHoje = visiveis.filter((t) => t.prazo === hoje).length;

  function concluir(t: Tarefa) {
    setConcluidas((c) => [...c, t.id]);
    startTransition(async () => {
      await mudarStatusTarefaAction(t.id, "concluida");
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <CheckSquare className="size-4" />
          Minhas tarefas de hoje
          {atrasadas > 0 && (
            <Badge variant="secondary" className="bg-red-100 text-red-700">
              {atrasadas} atrasada{atrasadas > 1 ? "s" : ""}
            </Badge>
          )}
          {deHoje > 0 && <Badge variant="secondary">{deHoje} para hoje</Badge>}
        </h2>
        <Link href="/tarefas" className="flex items-center gap-1 text-xs text-muted-foreground underline hover:text-foreground">
          Ver todas
          <ArrowRight className="size-3" />
        </Link>
      </div>

      <Card>
        <CardContent className="flex flex-col divide-y pt-2">
          {visiveis.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">Nenhuma tarefa atrasada ou para hoje. Tudo em dia.</p>
          ) : (
            visiveis.map((t) => {
              const atrasada = !!t.prazo && t.prazo < hoje;
              return (
                <div key={t.id} className="flex items-start gap-3 py-3 first:pt-4 last:pb-4">
                  <Checkbox className="mt-0.5" onCheckedChange={() => concluir(t)} aria-label="Concluir tarefa" />
                  <Link href={`/tarefas?tarefa=${t.id}`} className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-sm font-medium">{t.titulo}</span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {t.status === "fazendo" && <Badge variant="secondary">Em andamento</Badge>}
                      {(t.prioridade === "urgente" || t.prioridade === "alta") && (
                        <Badge variant="secondary" className={COR_PRIORIDADE[t.prioridade]}>
                          {TAREFA_PRIORIDADES.find((p) => p.id === t.prioridade)?.label}
                        </Badge>
                      )}
                      {t.prazo && (
                        <span className={atrasada ? "font-medium text-destructive" : undefined}>
                          {t.prazo === hoje ? "Hoje" : formatarPrazo(t.prazo)}
                          {atrasada && " · atrasada"}
                        </span>
                      )}
                      {t.obraNome && <span>{t.obraNome}</span>}
                    </span>
                  </Link>
                </div>
              );
            })
          )}
          {total > tarefas.length && (
            <p className="py-3 text-xs text-muted-foreground">
              E mais {total - tarefas.length} tarefa{total - tarefas.length > 1 ? "s" : ""} em{" "}
              <Link href="/tarefas" className="underline hover:text-foreground">
                Tarefas
              </Link>
              .
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
