"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { interpretarTarefaIAAction, salvarTarefaAction } from "@/lib/tarefa-actions";
import type { RascunhoTarefa } from "@/lib/tarefa-ia";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TarefaForm, type ObraOpcao } from "@/components/tarefa-form";
import { Loader2, Mic, Sparkles, Square } from "lucide-react";
import type { MembroEquipe } from "@/lib/types";

// A voz é transcrita no próprio aparelho (Chrome, Edge, Safari); só o texto vai para a IA.
type Reconhecimento = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type ConstrutorReconhecimento = new () => Reconhecimento;

const CHAVE_DIRETO = "tarefa-ia-direto";

function resumo(r: RascunhoTarefa, obras: ObraOpcao[], membros: MembroEquipe[], pessoal: boolean) {
  const partes: string[] = [];
  const obra = obras.find((o) => o.id === r.obraId)?.nome;
  if (obra) partes.push(obra);
  if (!pessoal) {
    const resp = membros.find((m) => m.id === r.responsavelId)?.nome;
    if (resp) partes.push(resp);
  }
  if (r.prazo) partes.push(`prazo ${r.prazo.split("-").reverse().join("/")}`);
  return partes.join(" · ");
}

export function TarefaIaBarra({
  pessoal,
  obraFixaId,
  membros,
  obras,
  usuarioId,
  onAbrir,
}: {
  pessoal: boolean;
  obraFixaId?: string;
  membros: MembroEquipe[];
  obras: ObraOpcao[];
  usuarioId: string;
  onAbrir: (id: string) => void;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [ouvindo, setOuvindo] = useState(false);
  const [temVoz, setTemVoz] = useState(false);
  const [direto, setDireto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [criada, setCriada] = useState<{ id: string; titulo: string; detalhe: string } | null>(null);
  const [rascunho, setRascunho] = useState<RascunhoTarefa | null>(null);
  const [pending, startTransition] = useTransition();
  const recRef = useRef<Reconhecimento | null>(null);
  const baseRef = useRef("");

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: ConstrutorReconhecimento;
      webkitSpeechRecognition?: ConstrutorReconhecimento;
    };
    setTemVoz(Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition));
    try {
      setDireto(window.localStorage.getItem(CHAVE_DIRETO) === "1");
    } catch {}
    return () => recRef.current?.stop();
  }, []);

  function alternarDireto(valor: boolean) {
    setDireto(valor);
    try {
      window.localStorage.setItem(CHAVE_DIRETO, valor ? "1" : "0");
    } catch {}
  }

  function alternarMic() {
    if (ouvindo) {
      recRef.current?.stop();
      return;
    }
    const w = window as unknown as {
      SpeechRecognition?: ConstrutorReconhecimento;
      webkitSpeechRecognition?: ConstrutorReconhecimento;
    };
    const Construtor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Construtor) return;
    setErro(null);
    setCriada(null);
    baseRef.current = texto.trim() ? `${texto.trim()} ` : "";
    const rec = new Construtor();
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      const falado = Array.from(e.results)
        .map((r) => r[0]?.transcript ?? "")
        .join(" ")
        .trim();
      setTexto(baseRef.current + falado);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setErro("Permita o uso do microfone no navegador para falar a tarefa.");
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        setErro("Não consegui ouvir. Tente de novo ou digite o pedido.");
      }
    };
    rec.onend = () => setOuvindo(false);
    recRef.current = rec;
    setOuvindo(true);
    try {
      rec.start();
    } catch {
      setOuvindo(false);
    }
  }

  function enviar() {
    if (!texto.trim() || pending) return;
    recRef.current?.stop();
    setErro(null);
    setCriada(null);
    startTransition(async () => {
      const res = await interpretarTarefaIAAction(texto, { pessoal, obraFixaId });
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
        responsavelId: r.responsavelId ?? (pessoal ? usuarioId : null),
        prazo: r.prazo,
        recorrencia: r.recorrencia,
        pessoal,
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
          placeholder={
            pessoal
              ? "Ex.: lembrar de renovar o seguro do carro até dia 20"
              : "Ex.: crie uma tarefa na obra do Edson para comprar argamassa, me coloque como responsável, prazo até sexta"
          }
          className="min-h-0 flex-1 resize-none"
        />
        <div className="flex flex-col gap-2">
          {temVoz && (
            <Button
              type="button"
              variant={ouvindo ? "destructive" : "outline"}
              size="icon"
              onClick={alternarMic}
              disabled={pending}
              aria-label={ouvindo ? "Parar de ouvir" : "Falar a tarefa"}
              title={ouvindo ? "Parar" : "Falar a tarefa"}
            >
              {ouvindo ? <Square className="size-4" /> : <Mic className="size-4" />}
            </Button>
          )}
          <Button type="button" size="icon" onClick={enviar} disabled={pending || !texto.trim()} aria-label="Criar tarefa">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <label className="flex cursor-pointer items-center gap-2">
          <Checkbox checked={direto} onCheckedChange={(v) => alternarDireto(!!v)} />
          Criar direto, sem revisar
        </label>
        {ouvindo && <span className="text-destructive">Ouvindo... fale a tarefa.</span>}
        {!temVoz && <span>Para falar em vez de digitar, use o microfone do teclado do celular.</span>}
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

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
              usuarioId={usuarioId}
              pessoal={pessoal}
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
