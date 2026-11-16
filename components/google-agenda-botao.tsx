"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarCheck, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { desconectarGoogleAgendaAction } from "@/lib/google-agenda-actions";

const AVISOS: Record<string, string> = {
  conectado: "Google Agenda conectado! Suas tarefas com prazo estão indo para a agenda \"Tarefas Vekio\" (pode levar alguns instantes).",
  negado: "A conexão com o Google Agenda foi cancelada.",
  erro: "Não consegui conectar ao Google Agenda. Tente de novo.",
};

export function GoogleAgendaBotao({ conectado }: { conectado: boolean }) {
  const router = useRouter();
  const aviso = AVISOS[useSearchParams().get("agenda") ?? ""];
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function desconectar() {
    if (!window.confirm("Desconectar o Google Agenda? A agenda \"Tarefas Vekio\" e seus eventos serão apagados da sua conta Google.")) {
      return;
    }
    setErro(null);
    startTransition(async () => {
      const res = await desconectarGoogleAgendaAction();
      if (res.error) setErro(res.error);
      else router.replace("/tarefas");
    });
  }

  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      {conectado ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
            <CalendarCheck className="size-4" />
            Google Agenda conectado
          </span>
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={desconectar}>
            {pending ? "Desconectando..." : "Desconectar"}
          </Button>
        </div>
      ) : (
        <Button render={<a href="/api/google/conectar" />} variant="outline" size="sm" nativeButton={false}>
          <CalendarPlus className="size-4" />
          Conectar Google Agenda
        </Button>
      )}
      {aviso && <p className="max-w-sm text-xs text-muted-foreground sm:text-right">{aviso}</p>}
      {erro && <p className="text-xs text-destructive">{erro}</p>}
    </div>
  );
}
