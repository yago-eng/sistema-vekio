"use client";

import { useState, useTransition } from "react";
import { salvarTarefaAction } from "@/lib/tarefa-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RascunhoTarefa } from "@/lib/tarefa-ia";
import {
  TAREFA_PRIORIDADES,
  TAREFA_RECORRENCIAS,
  type MembroEquipe,
  type Tarefa,
} from "@/lib/types";

const SEM = "none";

export type ObraOpcao = { id: string; nome: string };

export function TarefaForm({
  tarefa,
  membros,
  obras,
  obraFixaId,
  obraInicialId,
  usuarioId,
  pessoal: pessoalProp,
  gestao: gestaoProp,
  rascunho,
  onSalvo,
  onCancelar,
}: {
  tarefa?: Tarefa;
  membros: MembroEquipe[];
  obras: ObraOpcao[];
  obraFixaId?: string;
  obraInicialId?: string; // obra pré-selecionada (o campo continua editável)
  usuarioId: string;
  pessoal?: boolean;
  gestao?: boolean;
  rascunho?: RascunhoTarefa; // sugestão vinda da IA, para o usuário revisar
  onSalvo: (id: string) => void;
  onCancelar?: () => void;
}) {
  const pessoal = tarefa ? tarefa.pessoal : Boolean(pessoalProp);
  const gestao = tarefa ? tarefa.gestao : Boolean(gestaoProp);
  const [titulo, setTitulo] = useState(tarefa?.titulo ?? rascunho?.titulo ?? "");
  const [descricao, setDescricao] = useState(tarefa?.descricao ?? rascunho?.descricao ?? "");
  const [obraId, setObraId] = useState(tarefa?.obraId ?? rascunho?.obraId ?? obraFixaId ?? obraInicialId ?? SEM);
  const [responsavelIds, setResponsavelIds] = useState<string[]>(
    tarefa ? tarefa.responsaveis.map((r) => r.id) : (rascunho?.responsavelIds ?? [usuarioId])
  );
  const [prazo, setPrazo] = useState(tarefa?.prazo ?? rascunho?.prazo ?? "");
  const [prioridade, setPrioridade] = useState<string>(tarefa?.prioridade ?? rascunho?.prioridade ?? "normal");
  const [recorrencia, setRecorrencia] = useState<string>(tarefa?.recorrencia ?? rascunho?.recorrencia ?? "nenhuma");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    startTransition(async () => {
      const res = await salvarTarefaAction({
        id: tarefa?.id,
        obraId: obraId === SEM ? null : obraId,
        titulo,
        descricao,
        prioridade,
        responsavelIds,
        prazo: prazo || null,
        recorrencia,
        pessoal,
        gestao,
        checklist: tarefa ? undefined : rascunho?.checklist,
      });
      if (res.error || !res.id) {
        setErro(res.error ?? "Não foi possível salvar a tarefa.");
        return;
      }
      onSalvo(res.id);
    });
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="tarefa-titulo">Título</Label>
        <Input
          id="tarefa-titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          required
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="tarefa-descricao">Descrição (opcional)</Label>
        <Textarea
          id="tarefa-descricao"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Detalhes, links, o que precisa ser feito..."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {!obraFixaId && !pessoal && !gestao && (
          <div className="flex flex-col gap-2">
            <Label>Obra</Label>
            <Select
              value={obraId}
              onValueChange={(v) => setObraId(String(v))}
              items={{ [SEM]: "Geral (sem obra)", ...Object.fromEntries(obras.map((o) => [o.id, o.nome])) }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM}>Geral (sem obra)</SelectItem>
                {obras.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {!pessoal && (
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label>Responsáveis</Label>
            <div className="flex flex-wrap gap-2">
              {membros.map((m) => {
                const ativo = responsavelIds.includes(m.id);
                return (
                  <Button
                    key={m.id}
                    type="button"
                    size="sm"
                    variant={ativo ? "default" : "outline"}
                    className="rounded-full"
                    aria-pressed={ativo}
                    onClick={() =>
                      setResponsavelIds((atual) =>
                        ativo ? atual.filter((id) => id !== m.id) : [...atual, m.id]
                      )
                    }
                  >
                    {m.nome}
                  </Button>
                );
              })}
            </div>
            {responsavelIds.length === 0 && (
              <p className="text-xs text-muted-foreground">Sem responsável. Toque nos nomes para escolher um ou mais.</p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="tarefa-prazo">Prazo</Label>
          <Input id="tarefa-prazo" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Prioridade</Label>
          <Select
            value={prioridade}
            onValueChange={(v) => setPrioridade(String(v))}
            items={Object.fromEntries(TAREFA_PRIORIDADES.map((p) => [p.id, p.label]))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TAREFA_PRIORIDADES.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Repetir</Label>
          <Select
            value={recorrencia}
            onValueChange={(v) => setRecorrencia(String(v))}
            items={Object.fromEntries(TAREFA_RECORRENCIAS.map((r) => [r.id, r.label]))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TAREFA_RECORRENCIAS.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!tarefa && rascunho && rascunho.checklist.length > 0 && (
        <div className="flex flex-col gap-1 text-sm">
          <p className="text-xs text-muted-foreground">Checklist sugerido (você pode editar depois de criar):</p>
          <ul className="list-disc pl-5">
            {rascunho.checklist.map((i, n) => (
              <li key={n}>{i}</li>
            ))}
          </ul>
        </div>
      )}

      {recorrencia !== "nenhuma" && (
        <p className="text-xs text-muted-foreground">
          Ao concluir esta tarefa, a próxima já é criada automaticamente com o novo prazo.
        </p>
      )}

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <div className="flex justify-end gap-2">
        {onCancelar && (
          <Button type="button" variant="outline" onClick={onCancelar} disabled={pending}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : tarefa ? "Salvar" : "Criar tarefa"}
        </Button>
      </div>
    </form>
  );
}
