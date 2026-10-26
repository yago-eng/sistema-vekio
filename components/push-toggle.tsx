"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { removerPushSubscriptionAction, salvarPushSubscriptionAction } from "@/lib/actions";

type Estado = "carregando" | "nao-suportado" | "instalar-ios" | "negado" | "desativado" | "ativado";

function chaveParaBytes(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const bruto = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bruto, (c) => c.charCodeAt(0));
}

// Liga/desliga as notificações push neste aparelho. No iPhone só funciona com
// o app instalado na tela inicial (limitação da Apple).
export function PushToggle() {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const instalado =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true;
      const suporta = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!suporta) {
        setEstado(ios && !instalado ? "instalar-ios" : "nao-suportado");
        return;
      }
      if (Notification.permission === "denied") {
        setEstado("negado");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setEstado(sub && Notification.permission === "granted" ? "ativado" : "desativado");
      } catch {
        setEstado("desativado");
      }
    })();
  }, []);

  async function ativar() {
    setOcupado(true);
    setErro(null);
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setEstado(permissao === "denied" ? "negado" : "desativado");
        return;
      }
      const res = await fetch("/api/push/chave", { cache: "no-store" });
      if (!res.ok) throw new Error("Notificações no celular ainda não estão configuradas.");
      const { chave } = (await res.json()) as { chave: string };
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: chaveParaBytes(chave),
        }));
      const json = sub.toJSON();
      const r = await salvarPushSubscriptionAction({
        endpoint: json.endpoint ?? sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        userAgent: navigator.userAgent,
      });
      if (r.error) throw new Error(r.error);
      setEstado("ativado");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível ativar.");
    } finally {
      setOcupado(false);
    }
  }

  async function desativar() {
    setOcupado(true);
    setErro(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removerPushSubscriptionAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setEstado("desativado");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível desativar.");
    } finally {
      setOcupado(false);
    }
  }

  if (estado === "carregando") return null;

  return (
    <div className="flex flex-col gap-1 border-t px-4 py-3 text-xs">
      {estado === "ativado" && (
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <BellRing className="size-3.5" />
            Avisos no celular ativados
          </span>
          <button
            type="button"
            onClick={desativar}
            disabled={ocupado}
            className="text-muted-foreground underline hover:text-foreground disabled:opacity-50"
          >
            Desativar
          </button>
        </div>
      )}
      {estado === "desativado" && (
        <button
          type="button"
          onClick={ativar}
          disabled={ocupado}
          className="flex items-center gap-1.5 font-medium text-primary hover:underline disabled:opacity-50"
        >
          <BellRing className="size-3.5" />
          {ocupado ? "Ativando..." : "Ativar avisos no celular"}
        </button>
      )}
      {estado === "negado" && (
        <p className="text-muted-foreground">
          Os avisos estão bloqueados neste aparelho. Libere nas configurações do navegador/app para ativar.
        </p>
      )}
      {estado === "instalar-ios" && (
        <p className="text-muted-foreground">
          No iPhone, para receber avisos: toque em Compartilhar e em &quot;Adicionar à Tela de Início&quot;, abra o
          app por lá e ative aqui.
        </p>
      )}
      {estado === "nao-suportado" && (
        <p className="text-muted-foreground">Este navegador não permite avisos no celular.</p>
      )}
      {erro && <p className="text-destructive">{erro}</p>}
    </div>
  );
}
