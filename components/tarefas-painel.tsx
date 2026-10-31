"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mudarStatusTarefaAction } from "@/lib/tarefa-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TarefaForm, type ObraOpcao } from "@/components/tarefa-form";
import { COR_PRIORIDADE, TarefaDetalheDialog, formatarPrazo } from "@/components/tarefa-detalhe-dialog";
import { CheckSquare, ListChecks, MessageSquare, Paperclip, Plus, Repeat, User } from "lucide-react";
import { TAREFA_PRIORIDADES, type MembroEquipe, type Tarefa } from "@/lib/types";

type FiltroStatus = "abertas" | "concluidas" | "todas";

const MINHAS = "minhas";
const TODAS = "todas";
const SEM_RESPONSAVEL = "sem";

function somarDias(iso: string, dias: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function grupoDoPrazo(t: Tarefa, hoje: string): string {
  if (t.status === "concluida") return "Concluídas";
  if (!t.prazo) return "Sem prazo";
  if (t.prazo < hoje) return "Atrasadas";
  if (t.prazo === hoje) return "Hoje";
  if (t.prazo <= somarDias(hoje, 7)) return "Próximos 7 dias";
  return "Depois";
}

const ORDEM_GRUPOS = ["Atrasadas", "Hoje", "Próximos 7 dias", "Depois", "Sem prazo", "Concluídas"];
const PESO_PRIORIDADE: Record<string, number> = { urgente: 0, alta: 1, normal: 2, baixa: 3 };

export function TarefasPainel({
  tarefas,
  membros,
  obras,
  usuarioId,
  isAdmin,
  obraFixaId,
  abrirId,
}: {
  tarefas: Tarefa[];
  membros: MembroEquipe[];
  obras: ObraOpcao[];
  usuarioId: string;
  isAdmin: boolean;
  obraFixaId?: string;
  abrirId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [responsavel, setResponsavel] = useState<string>(obraFixaId ? TODAS : MINHAS);
  const [status, setStatus] = useState<FiltroStatus>("abertas");
  const [obra, setObra] = useState<string>(TODAS);
  const [busca, setBusca] = useState("");
  const [criando, setCriando] = useState(false);
  const [abertaId, setAbertaId] = useState<string | null>(abrirId ?? null);

  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return tarefas.filter((t) => {
      if (responsavel === MINHAS && t.responsavelId !== usuarioId) return false;
      if (responsavel === SEM_RESPONSAVEL && t.responsavelId) return false;
      if (responsavel !== MINHAS && responsavel !== TODAS && responsavel !== SEM_RESPONSAVEL && t.responsavelId !== responsavel) {
        return false;
      }
      if (status === "abertas" && t.status === "concluida") return false;
      if (status === "concluidas" && t.status !== "concluida") return false;
      if (obra === "geral" && t.obraId) return false;
      if (obra !== TODAS && obra !== "geral" && t.obraId !== obra) return false;
      if (termo && !`${t.titulo} ${t.descricao}`.toLowerCase().includes(termo)) return false;
      return true;
    });
  }, [tarefas, responsavel, status, obra, busca, usuarioId]);

  const grupos = useMemo(() => {
    const mapa = new Map<string, Tarefa[]>();
    for (const t of filtradas) {
      const g = grupoDoPrazo(t, hoje);
      if (!mapa.has(g)) mapa.set(g, []);
      mapa.get(g)!.push(t);
    }
    return ORDEM_GRUPOS.filter((g) => mapa.has(g)).map((g) => ({
      nome: g,
      itens: mapa.get(g)!.sort((a, b) => {
        if (g === "Concluídas") return (b.concluidaEm ?? "").localeCompare(a.concluidaEm ?? "");
        return (
          (a.prazo ?? "9999").localeCompare(b.prazo ?? "9999") ||
          PESO_PRIORIDADE[a.prioridade] - PESO_PRIORIDADE[b.prioridade] ||
          a.titulo.localeCompare(b.titulo)
        );
      }),
    }));
  }, [filtradas, hoje]);

  function alternarConcluida(t: Tarefa, concluir: boolean) {
    startTransition(async () => {
      await mudarStatusTarefaAction(t.id, concluir ? "concluida" : "a_fazer");
      router.refresh();
    });
  }

  const itensResponsavel: Record<string, string> = {
    [MINHAS]: "Minhas tarefas",
    [TODAS]: "Todas as pessoas",
    [SEM_RESPONSAVEL]: "Sem responsável",
    ...Object.fromEntries(membros.map((m) => [m.id, m.nome])),
  };
  const itensObra: Record<string, string> = {
    [TODAS]: "Todas as obras",
    geral: "Geral (sem obra)",
    ...Object.fromEntries(obras.map((o) => [o.id, o.nome])),
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Select value={responsavel} onValueChange={(v) => setResponsavel(String(v))} items={itensResponsavel}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={MINHAS}>Minhas tarefas</SelectItem>
            <SelectItem value={TODAS}>Todas as pessoas</SelectItem>
            <SelectItem value={SEM_RESPONSAVEL}>Sem responsável</SelectItem>
            {membros.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!obraFixaId && (
          <Select value={obra} onValueChange={(v) => setObra(String(v))} items={itensObra}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODAS}>Todas as obras</SelectItem>
              <SelectItem value="geral">Geral (sem obra)</SelectItem>
              {obras.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex gap-1">
          {(
            [
              ["abertas", "Abertas"],
              ["concluidas", "Concluídas"],
              ["todas", "Todas"],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={status === id ? "default" : "outline"}
              onClick={() => setStatus(id)}
            >
              {label}
            </Button>
          ))}
        </div>

        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar tarefa..."
          className="w-full sm:w-48"
        />

        <Button type="button" className="gap-2 sm:ml-auto" onClick={() => setCriando(true)}>
          <Plus className="size-4" />
          Nova tarefa
        </Button>
      </div>

      {grupos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          <CheckSquare className="size-8" />
          <p>
            {tarefas.length === 0
              ? "Nenhuma tarefa ainda. Crie a primeira em Nova tarefa."
              : "Nenhuma tarefa encontrada com esses filtros."}
          </p>
        </div>
      ) : (
        grupos.map((g) => (
          <section key={g.nome} className="flex flex-col gap-2">
            <h3
              className={
                g.nome === "Atrasadas"
                  ? "text-sm font-semibold text-destructive"
                  : "text-sm font-semibold text-muted-foreground"
              }
            >
              {g.nome} <span className="font-normal">({g.itens.length})</span>
            </h3>
            {g.itens.map((t) => {
              const atrasada = t.status !== "concluida" && !!t.prazo && t.prazo < hoje;
              return (
                <div
                  key={t.id}
                  className="flex items-start gap-3 rounded-lg border px-3 py-2 hover:bg-muted/40"
                >
                  <Checkbox
                    className="mt-1"
                    checked={t.status === "concluida"}
                    disabled={pending}
                    onCheckedChange={(v) => alternarConcluida(t, !!v)}
                    aria-label="Concluir tarefa"
                  />
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 flex-col gap-1 text-left"
                    onClick={() => setAbertaId(t.id)}
                  >
                    <span
                      className={
                        t.status === "concluida"
                          ? "text-sm text-muted-foreground line-through"
                          : "text-sm font-medium"
                      }
                    >
                      {t.titulo}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {t.status === "fazendo" && <Badge variant="secondary">Fazendo</Badge>}
                      {(t.prioridade === "urgente" || t.prioridade === "alta") && (
                        <Badge variant="secondary" className={COR_PRIORIDADE[t.prioridade]}>
                          {TAREFA_PRIORIDADES.find((p) => p.id === t.prioridade)?.label}
                        </Badge>
                      )}
                      {t.prazo && (
                        <span className={atrasada ? "font-medium text-destructive" : undefined}>
                          {formatarPrazo(t.prazo)}
                        </span>
                      )}
                      {!obraFixaId && t.obraNome && <span>{t.obraNome}</span>}
                      {t.responsavelNome && (
                        <span className="flex items-center gap-1">
                          <User className="size-3" />
                          {t.responsavelNome}
                        </span>
                      )}
                      {t.checklistTotal > 0 && (
                        <span className="flex items-center gap-1">
                          <ListChecks className="size-3" />
                          {t.checklistFeitos}/{t.checklistTotal}
                        </span>
                      )}
                      {t.comentarios > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="size-3" />
                          {t.comentarios}
                        </span>
                      )}
                      {t.anexos > 0 && (
                        <span className="flex items-center gap-1">
                          <Paperclip className="size-3" />
                          {t.anexos}
                        </span>
                      )}
                      {t.recorrencia !== "nenhuma" && <Repeat className="size-3" aria-label="Repete" />}
                    </span>
                  </button>
                </div>
              );
            })}
          </section>
        ))
      )}

      <Dialog open={criando} onOpenChange={setCriando}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Nova tarefa</DialogTitle>
          </DialogHeader>
          <TarefaForm
            membros={membros}
            obras={obras}
            obraFixaId={obraFixaId}
            usuarioId={usuarioId}
            onCancelar={() => setCriando(false)}
            onSalvo={() => {
              setCriando(false);
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>

      <TarefaDetalheDialog
        id={abertaId}
        onFechar={() => setAbertaId(null)}
        membros={membros}
        obras={obras}
        obraFixaId={obraFixaId}
        usuarioId={usuarioId}
        isAdmin={isAdmin}
      />
    </div>
  );
}
