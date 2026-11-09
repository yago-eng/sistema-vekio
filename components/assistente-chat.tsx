"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { executarAcaoAssistenteAction } from "@/lib/assistente-actions";
import type { AcaoProposta } from "@/lib/assistente";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, Check, Loader2, Mic, RotateCcw, Sparkles, Square, X } from "lucide-react";

type EstadoAcao = "pendente" | "executando" | "feita" | "cancelada" | "erro";
type AcaoUI = AcaoProposta & { estado: EstadoAcao; resultado?: string; link?: string };
type Msg = { id: string; role: "user" | "assistant"; texto: string; acoes?: AcaoUI[]; falha?: boolean };

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

const CHAVE = "assistente-chat-v1";

const TEXTO_ESTADO: Record<EstadoAcao, string> = {
  pendente: "aguardando confirmação",
  executando: "executando",
  feita: "CONFIRMADA e executada",
  cancelada: "cancelada pelo usuário",
  erro: "NÃO foi executada (deu erro)",
};

// O que a IA "lembra" da conversa: as mensagens e o que aconteceu com cada cartão.
function paraHistorico(msgs: Msg[]) {
  return msgs
    .filter((m) => !m.falha)
    .map((m) => ({
      role: m.role,
      content:
        m.texto +
        (m.acoes ?? []).map((a) => `\n[Cartão "${a.titulo}" — ${TEXTO_ESTADO[a.estado]}]`).join(""),
    }));
}

function novoId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function AssistenteChat({ ehAdmin, podeTarefas }: { ehAdmin: boolean; podeTarefas: boolean }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [entrada, setEntrada] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [carregado, setCarregado] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);
  const [temVoz, setTemVoz] = useState(false);
  const [erroVoz, setErroVoz] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<Reconhecimento | null>(null);
  const baseRef = useRef("");

  // Recupera a conversa se a página for recarregada (some ao fechar a aba).
  useEffect(() => {
    try {
      const salvo = window.sessionStorage.getItem(CHAVE);
      if (salvo) {
        const lista = JSON.parse(salvo) as Msg[];
        setMsgs(
          lista.map((m) => ({
            ...m,
            acoes: m.acoes?.map((a) =>
              a.estado === "executando" ? { ...a, estado: "erro" as const, resultado: "Não sei se foi concluída. Confira no sistema." } : a
            ),
          }))
        );
      }
    } catch {}
    const w = window as unknown as { SpeechRecognition?: ConstrutorReconhecimento; webkitSpeechRecognition?: ConstrutorReconhecimento };
    setTemVoz(Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition));
    setCarregado(true);
    return () => recRef.current?.stop();
  }, []);

  useEffect(() => {
    if (!carregado) return;
    try {
      window.sessionStorage.setItem(CHAVE, JSON.stringify(msgs));
    } catch {}
  }, [msgs, carregado]);

  useEffect(() => {
    if (aberto) fimRef.current?.scrollIntoView({ block: "end" });
  }, [msgs, carregando, aberto]);

  function alternarMic() {
    if (ouvindo) {
      recRef.current?.stop();
      return;
    }
    const w = window as unknown as { SpeechRecognition?: ConstrutorReconhecimento; webkitSpeechRecognition?: ConstrutorReconhecimento };
    const Construtor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Construtor) return;
    setErroVoz(null);
    baseRef.current = entrada.trim() ? `${entrada.trim()} ` : "";
    const rec = new Construtor();
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      const falado = Array.from(e.results)
        .map((r) => r[0]?.transcript ?? "")
        .join(" ")
        .trim();
      setEntrada(baseRef.current + falado);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setErroVoz("Permita o uso do microfone no navegador para falar.");
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        setErroVoz("Não consegui ouvir. Tente de novo ou digite.");
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

  async function enviar(textoDireto?: string) {
    const texto = (textoDireto ?? entrada).trim();
    if (!texto || carregando) return;
    recRef.current?.stop();
    setErroVoz(null);
    const lista: Msg[] = [...msgs, { id: novoId(), role: "user", texto }];
    setMsgs(lista);
    setEntrada("");
    setCarregando(true);
    try {
      const res = await fetch("/api/assistente", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mensagens: paraHistorico(lista) }),
      });
      const json = (await res.json()) as { texto?: string; acoes?: AcaoProposta[]; error?: string };
      if (json.error || typeof json.texto !== "string") {
        setMsgs([...lista, { id: novoId(), role: "assistant", texto: json.error ?? "Não consegui responder agora.", falha: true }]);
      } else {
        setMsgs([
          ...lista,
          {
            id: novoId(),
            role: "assistant",
            texto: json.texto,
            acoes: (json.acoes ?? []).map((a) => ({ ...a, estado: "pendente" as const })),
          },
        ]);
      }
    } catch {
      setMsgs([...lista, { id: novoId(), role: "assistant", texto: "Falha de conexão. Verifique a internet e tente de novo.", falha: true }]);
    } finally {
      setCarregando(false);
    }
  }

  function atualizarAcao(msgId: string, acaoId: string, mudanca: Partial<AcaoUI>) {
    setMsgs((atual) =>
      atual.map((m) =>
        m.id === msgId ? { ...m, acoes: m.acoes?.map((a) => (a.id === acaoId ? { ...a, ...mudanca } : a)) } : m
      )
    );
  }

  async function confirmar(msgId: string, acao: AcaoUI) {
    atualizarAcao(msgId, acao.id, { estado: "executando", resultado: undefined });
    try {
      const res = await executarAcaoAssistenteAction(acao.tipo, acao.dados);
      if (res.ok) {
        atualizarAcao(msgId, acao.id, { estado: "feita", resultado: res.mensagem, link: res.link });
        router.refresh();
      } else {
        atualizarAcao(msgId, acao.id, { estado: "erro", resultado: res.error });
      }
    } catch {
      atualizarAcao(msgId, acao.id, { estado: "erro", resultado: "Não consegui concluir. Confira no sistema antes de tentar de novo." });
    }
  }

  function limpar() {
    recRef.current?.stop();
    setMsgs([]);
    setEntrada("");
    setErroVoz(null);
  }

  const sugestoes = [
    podeTarefas ? "O que está atrasado nas minhas tarefas?" : "",
    ehAdmin ? "Quais pagamentos vencem nos próximos 7 dias?" : "",
    ehAdmin ? "Faça um resumo financeiro do ano" : "",
  ].filter(Boolean);

  if (!aberto) {
    return (
      <Button
        type="button"
        size="icon-lg"
        onClick={() => setAberto(true)}
        aria-label="Abrir o assistente"
        title="Assistente"
        className="fixed right-4 bottom-4 z-40 size-12 rounded-full shadow-lg print:hidden"
      >
        <Sparkles className="size-5" />
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex h-[100dvh] flex-col bg-background sm:inset-auto sm:right-4 sm:bottom-4 sm:h-[640px] sm:max-h-[calc(100dvh-2rem)] sm:w-[420px] sm:rounded-xl sm:border sm:shadow-2xl print:hidden">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Sparkles className="size-4 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-semibold leading-none">Assistente Vekio</p>
          <p className="mt-1 text-xs text-muted-foreground">Consulta e executa ações, sempre com a sua confirmação.</p>
        </div>
        {msgs.length > 0 && (
          <Button type="button" variant="ghost" size="icon" onClick={limpar} aria-label="Nova conversa" title="Nova conversa">
            <RotateCcw className="size-4" />
          </Button>
        )}
        <Button type="button" variant="ghost" size="icon" onClick={() => setAberto(false)} aria-label="Fechar">
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {msgs.length === 0 && (
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-muted-foreground">
              Pergunte sobre tarefas, gastos e finanças, ou peça para criar tarefas, lançar gastos e pagamentos. Você pode digitar ou falar.
            </p>
            <div className="flex flex-col items-start gap-2">
              {sugestoes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => enviar(s)}
                  className="rounded-full border px-3 py-1.5 text-left text-xs hover:bg-muted"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex flex-col items-start gap-2"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm whitespace-pre-wrap text-primary-foreground"
                  : m.falha
                    ? "max-w-[90%] rounded-2xl rounded-bl-sm border border-destructive/40 px-3 py-2 text-sm whitespace-pre-wrap text-destructive"
                    : "max-w-[90%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm whitespace-pre-wrap"
              }
            >
              {m.texto}
            </div>

            {m.acoes?.map((a) => (
              <div key={a.id} className="w-full max-w-[95%] rounded-lg border bg-background p-3 text-sm shadow-sm">
                <p className="font-medium">{a.titulo}</p>
                <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                  {a.linhas.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>

                {a.estado === "pendente" || a.estado === "executando" ? (
                  <div className="mt-3 flex gap-2">
                    <Button type="button" size="sm" disabled={a.estado === "executando"} onClick={() => confirmar(m.id, a)} className="gap-1.5">
                      {a.estado === "executando" ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                      {a.estado === "executando" ? "Executando..." : "Confirmar"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={a.estado === "executando"}
                      onClick={() => atualizarAcao(m.id, a.id, { estado: "cancelada" })}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : a.estado === "feita" ? (
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <Check className="size-3.5" />
                    {a.resultado}
                    {a.link && (
                      <Link
                        href={a.link}
                        onClick={() => {
                          if (window.innerWidth < 640) setAberto(false);
                        }}
                        className="text-primary underline underline-offset-2"
                      >
                        Abrir
                      </Link>
                    )}
                  </p>
                ) : a.estado === "cancelada" ? (
                  <p className="mt-2 text-xs text-muted-foreground">Cancelada.</p>
                ) : (
                  <div className="mt-2 flex flex-col gap-2">
                    <p className="text-xs text-destructive">{a.resultado ?? "Não foi possível executar."}</p>
                    <Button type="button" size="sm" variant="outline" className="self-start" onClick={() => confirmar(m.id, a)}>
                      Tentar de novo
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {carregando && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Pensando...
          </div>
        )}
        <div ref={fimRef} />
      </div>

      <div className="border-t p-3">
        {erroVoz && <p className="mb-2 text-xs text-destructive">{erroVoz}</p>}
        {ouvindo && <p className="mb-2 text-xs text-destructive">Ouvindo... fale o pedido.</p>}
        <div className="flex items-end gap-2">
          <Textarea
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviar();
              }
            }}
            rows={2}
            disabled={carregando}
            placeholder="Escreva ou fale o seu pedido..."
            className="min-h-0 flex-1 resize-none text-base sm:text-sm"
          />
          {temVoz && (
            <Button
              type="button"
              variant={ouvindo ? "destructive" : "outline"}
              size="icon-lg"
              onClick={alternarMic}
              disabled={carregando}
              aria-label={ouvindo ? "Parar de ouvir" : "Falar"}
            >
              {ouvindo ? <Square className="size-4" /> : <Mic className="size-4" />}
            </Button>
          )}
          <Button type="button" size="icon-lg" onClick={() => enviar()} disabled={carregando || !entrada.trim()} aria-label="Enviar">
            {carregando ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
