"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  Building2,
  CalendarHeart,
  CheckCircle2,
  ClipboardList,
  FileText,
  ImageIcon,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import { marcarNotificacaoLidaAction, marcarNotificacoesLidasAction } from "@/lib/actions";
import { PushToggle } from "@/components/push-toggle";
import { cn } from "@/lib/utils";
import type { NotificacaoItem, NotificacaoTipo } from "@/lib/types";

const POLL_MS = 60_000;

const ICONES: Record<NotificacaoTipo, { icon: LucideIcon; classe: string }> = {
  obra_criada: { icon: Building2, classe: "bg-blue-100 text-blue-700" },
  proposta_criada: { icon: ClipboardList, classe: "bg-orange-100 text-orange-700" },
  orcamento_efetivado: { icon: CheckCircle2, classe: "bg-green-100 text-green-700" },
  lancamentos: { icon: Receipt, classe: "bg-purple-100 text-purple-700" },
  fotos: { icon: ImageIcon, classe: "bg-indigo-100 text-indigo-700" },
  documentos: { icon: FileText, classe: "bg-teal-100 text-teal-700" },
  parcela_vence: { icon: AlertTriangle, classe: "bg-amber-100 text-amber-700" },
  conta_pagar: { icon: AlertTriangle, classe: "bg-amber-100 text-amber-700" },
  data_importante: { icon: CalendarHeart, classe: "bg-pink-100 text-pink-700" },
};

function quando(iso: string) {
  const d = new Date(iso);
  const hoje = new Date();
  const mesmoDia =
    d.getFullYear() === hoje.getFullYear() &&
    d.getMonth() === hoje.getMonth() &&
    d.getDate() === hoje.getDate();
  return mesmoDia
    ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function diaDe(iso: string) {
  const d = new Date(iso);
  const zero = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((zero(new Date()) - zero(d)) / 86_400_000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
}

export function NotificationBell() {
  const router = useRouter();
  const raiz = useRef<HTMLDivElement>(null);
  const [aberto, setAberto] = useState(false);
  const [itens, setItens] = useState<NotificacaoItem[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [aba, setAba] = useState<"pendentes" | "historico">("pendentes");

  const carregar = useCallback(async () => {
    // O sino existe duas vezes no HTML (barra do celular e menu do desktop);
    // só busca o que estiver visível.
    if (!raiz.current || raiz.current.offsetParent === null) return;
    try {
      const res = await fetch("/api/notificacoes", { cache: "no-store" });
      if (!res.ok) return;
      const dados = (await res.json()) as { itens: NotificacaoItem[]; naoLidas: number };
      setItens(dados.itens);
      setNaoLidas(dados.naoLidas);
    } catch {
      // sem conexão: mantém o que já tem
    }
  }, []);

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, POLL_MS);
    const aoVoltar = () => {
      if (document.visibilityState === "visible") carregar();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [carregar]);

  useEffect(() => {
    if (!aberto) return;
    function fora(e: MouseEvent | TouchEvent) {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    document.addEventListener("touchstart", fora);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("touchstart", fora);
    };
  }, [aberto]);

  function abrir(n: NotificacaoItem) {
    setAberto(false);
    if (!n.lida) {
      setItens((is) => is.map((i) => (i.id === n.id ? { ...i, lida: true } : i)));
      setNaoLidas((v) => Math.max(0, v - 1));
      marcarNotificacaoLidaAction(n.id).catch(() => carregar());
    }
    if (n.link) router.push(n.link);
  }

  async function marcarTodas() {
    setNaoLidas(0);
    setItens((is) => is.map((i) => ({ ...i, lida: true })));
    await marcarNotificacoesLidasAction();
  }

  const visiveis = aba === "pendentes" ? itens.filter((i) => !i.lida) : itens;

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        aria-label={naoLidas > 0 ? `Notificações (${naoLidas} não lidas)` : "Notificações"}
        onClick={() => {
          setAberto((v) => !v);
          if (!aberto) carregar();
        }}
        className="relative flex size-9 items-center justify-center rounded-full border bg-background text-foreground hover:bg-muted"
      >
        <Bell className="size-4" />
        {naoLidas > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {naoLidas > 99 ? "99+" : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg md:absolute md:inset-x-auto md:top-full md:right-0 md:left-auto md:mt-2 md:w-96">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              Notificações
              {naoLidas > 0 && (
                <span className="rounded-full bg-red-600 px-1.5 text-[10px] font-semibold text-white">
                  {naoLidas}
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={marcarTodas}
              disabled={naoLidas === 0}
              className="text-xs text-muted-foreground underline hover:text-foreground disabled:no-underline disabled:opacity-50"
            >
              Marcar todas como lidas
            </button>
          </div>

          <div className="flex border-b text-xs font-medium">
            {(["pendentes", "historico"] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAba(a)}
                className={cn(
                  "flex-1 px-4 py-2",
                  aba === a
                    ? "border-b-2 border-foreground text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {a === "pendentes" ? `Pendentes${naoLidas > 0 ? ` (${naoLidas})` : ""}` : "Histórico"}
              </button>
            ))}
          </div>

          <div className="max-h-[70vh] overflow-y-auto md:max-h-96">
            {visiveis.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                {aba === "pendentes"
                  ? "Tudo em dia — nenhuma notificação pendente."
                  : "Nenhuma notificação por enquanto."}
              </p>
            ) : (
              visiveis.map((n, idx) => {
                const { icon: Icone, classe } = ICONES[n.tipo] ?? ICONES.lancamentos;
                const dia = diaDe(n.quando);
                const novoDia = idx === 0 || diaDe(visiveis[idx - 1].quando) !== dia;
                return (
                  <div key={n.id}>
                    {novoDia && (
                      <p className="sticky top-0 border-b bg-muted/60 px-4 py-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase backdrop-blur-sm">
                        {dia}
                      </p>
                    )}
                  <button
                    type="button"
                    onClick={() => abrir(n)}
                    className={cn(
                      "flex w-full items-start gap-3 border-b px-4 py-3 text-left hover:bg-muted/50",
                      n.lida && "opacity-60"
                    )}
                  >
                    <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", classe)}>
                      <Icone className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold">{n.titulo}</span>
                        <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                          {quando(n.quando)}
                          {!n.lida && <span className="size-2 rounded-full bg-red-600" />}
                        </span>
                      </span>
                      {n.descricao && (
                        <span className="mt-0.5 block text-xs text-muted-foreground">{n.descricao}</span>
                      )}
                      {n.obraNome && (
                        <span className="mt-0.5 block text-[11px] text-muted-foreground/80">{n.obraNome}</span>
                      )}
                    </span>
                  </button>
                  </div>
                );
              })
            )}
          </div>
          <PushToggle />
        </div>
      )}
    </div>
  );
}
