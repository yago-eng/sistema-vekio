"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
import { TarefaIaBarra } from "@/components/tarefa-ia-barra";
import { COR_PRIORIDADE, TarefaDetalheDialog, formatarPrazo } from "@/components/tarefa-detalhe-dialog";
import {
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ListChecks,
  MessageSquare,
  Paperclip,
  Play,
  Plus,
  Repeat,
  Star,
  Undo2,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TAREFA_PRIORIDADES, type MembroEquipe, type Tarefa, type TarefaStatus } from "@/lib/types";

const MINHAS = "minhas";
const TODAS = "todas";
const SEM_RESPONSAVEL = "sem";
const LIMITE_CONCLUIDAS = 30;

const PESO_PRIORIDADE: Record<string, number> = { urgente: 0, alta: 1, normal: 2, baixa: 3 };

const SECOES: { id: TarefaStatus; titulo: string; vazio: string }[] = [
  { id: "concluida", titulo: "Concluídas", vazio: "Nenhuma tarefa concluída." },
  { id: "fazendo", titulo: "Em andamento", vazio: "Nada em andamento." },
  { id: "a_fazer", titulo: "Pendentes", vazio: "Nenhuma tarefa pendente." },
];

export function TarefasPainel({
  tarefas,
  membros,
  obras,
  usuarioId,
  isAdmin,
  obraFixaId,
  pessoal = false,
  favoritas = [],
  abrirId,
}: {
  tarefas: Tarefa[];
  membros: MembroEquipe[];
  obras: ObraOpcao[];
  usuarioId: string;
  isAdmin: boolean;
  obraFixaId?: string;
  pessoal?: boolean;
  favoritas?: ObraOpcao[];
  abrirId?: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [responsavel, setResponsavel] = useState<string>(obraFixaId || pessoal ? TODAS : MINHAS);
  const [obra, setObra] = useState<string>(TODAS);
  const [busca, setBusca] = useState("");
  const [criando, setCriando] = useState(false);
  const [abertaId, setAbertaId] = useState<string | null>(abrirId ?? null);
  const [verTodasConcluidas, setVerTodasConcluidas] = useState(false);
  // Mudança de fase aparece na hora; o servidor confirma em seguida.
  const [otimista, setOtimista] = useState<Record<string, TarefaStatus>>({});
  const [arrastandoId, setArrastandoId] = useState<string | null>(null);
  const [sobreSecao, setSobreSecao] = useState<string | null>(null);

  // Seções recolhidas ficam salvas neste aparelho; "Concluídas" começa recolhida.
  const chaveRecolhidas = `tarefas-recolhidas-${pessoal ? "pessoal" : obraFixaId ? "obra" : "equipe"}`;
  const [recolhidas, setRecolhidas] = useState<Record<string, boolean>>({ concluida: true });
  useEffect(() => {
    try {
      const salvo = window.localStorage.getItem(chaveRecolhidas);
      if (salvo) setRecolhidas(JSON.parse(salvo));
    } catch {}
  }, [chaveRecolhidas]);

  function alternarSecao(id: string) {
    setRecolhidas((atual) => {
      const novo = { ...atual, [id]: !atual[id] };
      try {
        window.localStorage.setItem(chaveRecolhidas, JSON.stringify(novo));
      } catch {}
      return novo;
    });
  }

  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const mostrarFiltroResponsavel = !pessoal;
  const mostrarFiltroObra = !pessoal && !obraFixaId;

  const secoes = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const atuais = tarefas.map((t) =>
      otimista[t.id] && otimista[t.id] !== t.status
        ? {
            ...t,
            status: otimista[t.id],
            concluidaEm: otimista[t.id] === "concluida" ? new Date().toISOString() : null,
          }
        : t
    );
    const filtradas = atuais.filter((t) => {
      if (responsavel === MINHAS && t.responsavelId !== usuarioId) return false;
      if (responsavel === SEM_RESPONSAVEL && t.responsavelId) return false;
      if (responsavel !== MINHAS && responsavel !== TODAS && responsavel !== SEM_RESPONSAVEL && t.responsavelId !== responsavel) {
        return false;
      }
      if (obra === "geral" && t.obraId) return false;
      if (obra !== TODAS && obra !== "geral" && t.obraId !== obra) return false;
      if (termo && !`${t.titulo} ${t.descricao}`.toLowerCase().includes(termo)) return false;
      return true;
    });
    return SECOES.map((s) => ({
      ...s,
      itens: filtradas
        .filter((t) => t.status === s.id)
        .sort((a, b) => {
          if (s.id === "concluida") return (b.concluidaEm ?? "").localeCompare(a.concluidaEm ?? "");
          return (
            (a.prazo ?? "9999").localeCompare(b.prazo ?? "9999") ||
            PESO_PRIORIDADE[a.prioridade] - PESO_PRIORIDADE[b.prioridade] ||
            a.titulo.localeCompare(b.titulo)
          );
        }),
    }));
  }, [tarefas, otimista, responsavel, obra, busca, usuarioId]);

  function mover(t: Tarefa, status: TarefaStatus) {
    if (otimista[t.id] ? otimista[t.id] === status : t.status === status) return;
    setOtimista((o) => ({ ...o, [t.id]: status }));
    startTransition(async () => {
      await mudarStatusTarefaAction(t.id, status);
      router.refresh();
      setOtimista((o) => {
        const resto = { ...o };
        delete resto[t.id];
        return resto;
      });
    });
  }

  // Clicar numa obra favorita mostra só as tarefas dela, de todas as pessoas.
  function escolherObraFavorita(id: string) {
    if (obra === id) {
      setObra(TODAS);
      setResponsavel(MINHAS);
    } else {
      setObra(id);
      setResponsavel(TODAS);
    }
  }

  function soltar(secaoId: TarefaStatus) {
    const t = tarefas.find((x) => x.id === arrastandoId);
    setArrastandoId(null);
    setSobreSecao(null);
    if (t) mover(t, secaoId);
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
      <TarefaIaBarra
        pessoal={pessoal}
        obraFixaId={obraFixaId}
        obraAtualId={mostrarFiltroObra && obra !== TODAS && obra !== "geral" ? obra : undefined}
        membros={membros}
        obras={obras}
        usuarioId={usuarioId}
        onAbrir={setAbertaId}
      />

      {mostrarFiltroObra && favoritas.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
            <Star className="size-4 fill-amber-400 text-amber-500" />
            Obras favoritas
          </span>
          {favoritas.map((f) => {
            const abertas = tarefas.filter((t) => t.obraId === f.id && t.status !== "concluida").length;
            const ativa = obra === f.id;
            return (
              <Button
                key={f.id}
                type="button"
                size="sm"
                variant={ativa ? "default" : "outline"}
                className="gap-2 rounded-full"
                aria-pressed={ativa}
                onClick={() => escolherObraFavorita(f.id)}
              >
                {f.nome}
                {abertas > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-xs",
                      ativa ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {abertas}
                  </span>
                )}
              </Button>
            );
          })}
          {obra !== TODAS && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setObra(TODAS);
                setResponsavel(MINHAS);
              }}
            >
              Limpar filtro
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {mostrarFiltroResponsavel && (
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
        )}

        {mostrarFiltroObra && (
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

      {tarefas.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
          <CheckSquare className="size-8" />
          <p>Nenhuma tarefa ainda. Crie a primeira em Nova tarefa{pessoal ? "" : " ou peça para a IA"}.</p>
        </div>
      )}

      {tarefas.length > 0 &&
        secoes.map((s) => {
          const recolhida = !!recolhidas[s.id];
          const atrasadas = s.id === "concluida" ? 0 : s.itens.filter((t) => t.prazo && t.prazo < hoje).length;
          const visiveis =
            s.id === "concluida" && !verTodasConcluidas ? s.itens.slice(0, LIMITE_CONCLUIDAS) : s.itens;
          return (
            <section
              key={s.id}
              className={cn(
                "flex flex-col gap-2 rounded-lg transition-colors",
                arrastandoId && sobreSecao === s.id && "bg-primary/5 ring-2 ring-primary/40 ring-offset-4 ring-offset-background"
              )}
              onDragOver={(e) => {
                if (!arrastandoId) return;
                e.preventDefault();
                if (sobreSecao !== s.id) setSobreSecao(s.id);
              }}
              onDrop={(e) => {
                e.preventDefault();
                soltar(s.id);
              }}
            >
              <button
                type="button"
                onClick={() => alternarSecao(s.id)}
                aria-expanded={!recolhida}
                className="flex items-center gap-2 text-left text-sm font-semibold hover:text-foreground"
              >
                {recolhida ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                {s.titulo}
                <span className="font-normal text-muted-foreground">({s.itens.length})</span>
                {atrasadas > 0 && (
                  <Badge variant="secondary" className="bg-red-100 text-red-700">
                    {atrasadas} atrasada{atrasadas > 1 ? "s" : ""}
                  </Badge>
                )}
              </button>

              {!recolhida && s.itens.length === 0 && (
                <p className="pl-6 text-xs text-muted-foreground">{s.vazio}</p>
              )}

              {!recolhida &&
                visiveis.map((t) => {
                  const atrasada = t.status !== "concluida" && !!t.prazo && t.prazo < hoje;
                  return (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", t.id);
                        setArrastandoId(t.id);
                      }}
                      onDragEnd={() => {
                        setArrastandoId(null);
                        setSobreSecao(null);
                      }}
                      className={cn(
                        "flex items-start gap-3 rounded-lg border px-3 py-2 hover:bg-muted/40",
                        arrastandoId === t.id && "opacity-40"
                      )}
                    >
                      <Checkbox
                        className="mt-1"
                        checked={t.status === "concluida"}
                        onCheckedChange={(v) => mover(t, v ? "concluida" : "a_fazer")}
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
                          {(t.prioridade === "urgente" || t.prioridade === "alta") && (
                            <Badge variant="secondary" className={COR_PRIORIDADE[t.prioridade]}>
                              {TAREFA_PRIORIDADES.find((p) => p.id === t.prioridade)?.label}
                            </Badge>
                          )}
                          {t.prazo && (
                            <span className={atrasada ? "font-medium text-destructive" : undefined}>
                              {formatarPrazo(t.prazo)}
                              {atrasada && " · atrasada"}
                            </span>
                          )}
                          {!obraFixaId && t.obraNome && <span>{t.obraNome}</span>}
                          {!pessoal && t.responsavelNome && (
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
                      {t.status === "a_fazer" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0 gap-1.5"
                          onClick={() => mover(t, "fazendo")}
                        >
                          <Play className="size-3.5" />
                          Iniciar
                        </Button>
                      )}
                      {t.status === "fazendo" && (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Voltar para pendentes"
                            title="Voltar para Pendentes"
                            onClick={() => mover(t, "a_fazer")}
                          >
                            <Undo2 className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="shrink-0 gap-1.5"
                            onClick={() => mover(t, "concluida")}
                          >
                            <Check className="size-3.5" />
                            Concluir
                          </Button>
                        </>
                      )}
                      {t.status === "concluida" && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Reabrir tarefa"
                          title="Reabrir (voltar para Pendentes)"
                          onClick={() => mover(t, "a_fazer")}
                        >
                          <Undo2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  );
                })}

              {!recolhida && s.id === "concluida" && s.itens.length > LIMITE_CONCLUIDAS && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  onClick={() => setVerTodasConcluidas((v) => !v)}
                >
                  {verTodasConcluidas ? "Mostrar menos" : `Mostrar todas (${s.itens.length})`}
                </Button>
              )}
            </section>
          );
        })}

      <Dialog open={criando} onOpenChange={setCriando}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{pessoal ? "Nova tarefa pessoal" : "Nova tarefa"}</DialogTitle>
          </DialogHeader>
          <TarefaForm
            membros={membros}
            obras={obras}
            obraFixaId={obraFixaId}
            obraInicialId={mostrarFiltroObra && obra !== TODAS && obra !== "geral" ? obra : undefined}
            usuarioId={usuarioId}
            pessoal={pessoal}
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
