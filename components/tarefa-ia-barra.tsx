"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { interpretarTarefaIAAction, salvarTarefaAction } from "@/lib/tarefa-actions";
import type { RascunhoTarefa } from "@/lib/tarefa-ia";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useVoz } from "@/components/use-voz";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TarefaForm, type ObraOpcao } from "@/components/tarefa-form";
import { Loader2, Mic, Sparkles, Square } from "lucide-react";
import type { MembroEquipe } from "@/lib/types";

const CHAVE_DIRETO = "tarefa-ia-direto";

function resumo(r: RascunhoTarefa, obras: ObraOpcao[], membros: MembroEquipe[], pessoal: boolean) {
  const partes: string[] = [];
  const obra = obras.find((o) => o.id === r.obraId)?.nome;
  if (obra) partes.push(obra);
  if (!pessoal) {
    const resp = r.responsavelIds
      .map((id) => membros.find((m) => m.id === id)?.nome)
      .filter(Boolean)
      .join(", ");
    if (resp) partes.push(resp);
  }
  if (r.prazo) partes.push(`prazo ${r.prazo.split("-").reverse().join("/")}`);
  return partes.join(" · ");
}

export function TarefaIaBarra({
  pessoal,
  gestao = false,
  obraFixaId,
  obraAtualId,
  membros,
  obras,
  usuarioId,
  onAbrir,
}: {
  pessoal: boolean;
  gestao?: boolean;
  obraFixaId?: string;
  obraAtualId?: string; // obra filtrada na lista: a IA assume essa obra, a menos que o pedido cite outra
  membros: MembroEquipe[];
  obras: ObraOpcao[];
  usuarioId: string;
  onAbrir: (id: string) => void;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [direto, setDireto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [criada, setCriada] = useState<{ id: string; titulo: string; detalhe: string } | null>(null);
  const [rascunho, setRascunho] = useState<RascunhoTarefa | null>(null);
  const [pending, startTransition] = useTransition();
  const voz = useVoz(() => texto, setTexto);

  useEffect(() => {
    try {
      setDireto(window.localStorage.getItem(CHAVE_DIRETO) === "1");
    } catch {}
  }, []);

  function alternarDireto(valor: boolean) {
    setDireto(valor);
    try {
      window.localStorage.setItem(CHAVE_DIRETO, valor ? "1" : "0");
    } catch {}
  }

  function enviar() {
    if (!texto.trim() || pending) return;
    voz.parar();
    setErro(null);
    setCriada(null);
    startTransition(async () => {
      const res = await interpretarTarefaIAAction(texto, { pessoal, gestao, obraFixaId: obraFixaId ?? obraAtualId });
      if (res.error || !res.rascunho) {
        setErro(res.error ?? "Não consegui montar a tarefa.");
        return;
      }
      const r = res.rascunho;
      if (!direto) {
        setRascunho(r);
        return;
      }
      const salva = await salvarTarefaAction({
        obraId: r.obraId,
        titulo: r.titulo,
        descricao: r.descricao,
        prioridade: r.prioridade,
        responsavelIds: r.responsavelIds.length > 0 ? r.responsavelIds : pessoal ? [usuarioId] : [],
        prazo: r.prazo,
        recorrencia: r.recorrencia,
        pessoal,
        gestao,
        checklist: r.checklist,
      });
      if (salva.error || !salva.id) {
        setErro(salva.error ?? "Não foi possível criar a tarefa.");
        return;
      }
      setTexto("");
      setCriada({ id: salva.id, titulo: r.titulo, detalhe: resumo(r, obras, membros, pessoal) });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="size-4 text-primary" />
        Criar tarefa com IA
      </div>
      <div className="flex gap-2">
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar();
            }
          }}
          rows={2}
          disabled={pending}
          placeholder="Descreva a tarefa por texto ou voz..."
          className="min-h-0 flex-1 resize-none"
        />
        <div className="flex flex-col gap-2">
          {voz.temVoz && (
            <Button
              type="button"
              variant={voz.ouvindo ? "destructive" : "outline"}
              size="icon"
              onClick={voz.alternar}
              disabled={pending || voz.transcrevendo}
              aria-label={voz.ouvindo ? "Parar de ouvir" : "Falar a tarefa"}
              title={voz.ouvindo ? "Parar" : "Falar a tarefa"}
            >
              {voz.ouvindo ? <Square className="size-4" /> : <Mic className="size-4" />}
            </Button>
          )}
          <Button type="button" size="icon" onClick={enviar} disabled={pending || voz.transcrevendo || !texto.trim()} aria-label="Criar tarefa">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <label className="flex cursor-pointer items-center gap-2">
          <Checkbox checked={direto} onCheckedChange={(v) => alternarDireto(!!v)} />
          Criar direto, sem revisar
        </label>
        {voz.transcrevendo && (
          <span className="flex items-center gap-1.5">
            <Loader2 className="size-3 animate-spin" />
            Transcrevendo o áudio...
          </span>
        )}
        {voz.ouvindo && <span className="text-destructive">Ouvindo... fale a tarefa e toque em parar quando terminar.</span>}
        {!voz.temVoz && <span>Para falar em vez de digitar, use o microfone do teclado do celular.</span>}
      </div>

      {(erro ?? voz.erro) && <p className="text-sm text-destructive">{erro ?? voz.erro}</p>}

      {criada && (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-background px-3 py-2 text-sm">
          <span>
            Tarefa criada: <strong>{criada.titulo}</strong>
            {criada.detalhe && <span className="text-muted-foreground"> ({criada.detalhe})</span>}
          </span>
          <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={() => onAbrir(criada.id)}>
            Abrir
          </Button>
        </div>
      )}

      <Dialog open={!!rascunho} onOpenChange={(aberto) => !aberto && setRascunho(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Confira a tarefa</DialogTitle>
            <DialogDescription>A IA preencheu os campos a partir do seu pedido. Ajuste o que precisar.</DialogDescription>
          </DialogHeader>
          {rascunho && (
            <TarefaForm
              rascunho={rascunho}
              membros={membros}
              obras={obras}
              obraFixaId={obraFixaId}
              obraInicialId={obraAtualId}
              usuarioId={usuarioId}
              pessoal={pessoal}
              gestao={gestao}
              onCancelar={() => setRascunho(null)}
              onSalvo={(id) => {
                const r = rascunho;
                setRascunho(null);
                setTexto("");
                setCriada({ id, titulo: r.titulo, detalhe: resumo(r, obras, membros, pessoal) });
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
