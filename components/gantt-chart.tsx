"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { deleteEtapaAction, updateEtapaAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Etapa } from "@/lib/types";

const ROW_HEIGHT = "h-14";

function parseDate(iso: string) {
  return new Date(iso + "T00:00:00");
}

function diffDays(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

function formatDateShort(iso: string) {
  return parseDate(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function monthLabel(d: Date) {
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
}

function EditEtapaDialog({ obraId, etapa }: { obraId: string; etapa: Etapa }) {
  const [open, setOpen] = useState(false);
  const action = updateEtapaAction.bind(null, obraId, etapa.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    if (state && !state.error) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <Pencil className="size-3.5" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar etapa</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`nome-${etapa.id}`}>Nome da etapa</Label>
            <Input id={`nome-${etapa.id}`} name="nome" required defaultValue={etapa.nome} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`dataInicio-${etapa.id}`}>Início</Label>
              <Input
                id={`dataInicio-${etapa.id}`}
                name="dataInicio"
                type="date"
                required
                defaultValue={etapa.dataInicio}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`dataFim-${etapa.id}`}>Fim</Label>
              <Input
                id={`dataFim-${etapa.id}`}
                name="dataFim"
                type="date"
                required
                defaultValue={etapa.dataFim}
              />
            </div>
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function GanttChart({
  obraId,
  etapas,
  readOnly = false,
}: {
  obraId: string;
  etapas: Etapa[];
  readOnly?: boolean;
}) {
  const [, startTransition] = useTransition();

  if (etapas.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhuma etapa cadastrada ainda. Crie a primeira etapa para montar o cronograma.
      </p>
    );
  }

  const rangeStart = parseDate(etapas.reduce((min, e) => (e.dataInicio < min ? e.dataInicio : min), etapas[0].dataInicio));
  const rangeEnd = parseDate(etapas.reduce((max, e) => (e.dataFim > max ? e.dataFim : max), etapas[0].dataFim));
  const totalDays = Math.max(diffDays(rangeEnd, rangeStart) + 1, 1);

  const months: { label: string; widthPct: number }[] = [];
  let cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  while (cursor <= rangeEnd) {
    const monthStart = cursor < rangeStart ? rangeStart : cursor;
    const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    const monthEnd = nextMonth > rangeEnd ? rangeEnd : new Date(nextMonth.getTime() - 86_400_000);
    const days = diffDays(monthEnd, monthStart) + 1;
    months.push({ label: monthLabel(cursor), widthPct: (days / totalDays) * 100 });
    cursor = nextMonth;
  }

  return (
    <div className="flex items-start gap-px overflow-hidden rounded-lg border">
      {/* Painel fixo: nome, datas, progresso e ações — nunca precisa de scroll */}
      <div className="flex shrink-0 flex-col divide-y">
        <div className={cn("flex items-center gap-2 border-b bg-muted/50 px-3", ROW_HEIGHT)}>
          <span className="w-40 text-xs font-medium text-muted-foreground">Etapa</span>
          <span className="w-14 text-right text-xs font-medium text-muted-foreground">Progresso</span>
        </div>
        {etapas.map((etapa) => (
          <div key={etapa.id} className={cn("flex items-center gap-2 px-3", ROW_HEIGHT)}>
            <div className="flex w-40 flex-col justify-center gap-0.5">
              <p className="truncate text-sm font-medium">{etapa.nome}</p>
              <p className="text-[11px] text-muted-foreground">
                {formatDateShort(etapa.dataInicio)} – {formatDateShort(etapa.dataFim)}
              </p>
            </div>
            <span className="w-14 text-right text-xs text-muted-foreground">{etapa.progresso}%</span>
            {!readOnly && (
              <div className="flex items-center gap-1.5">
                <EditEtapaDialog obraId={obraId} etapa={etapa} />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => startTransition(() => deleteEtapaAction(obraId, etapa.id))}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Linha do tempo: só essa parte rola horizontalmente quando necessário */}
      <div className="min-w-0 flex-1 overflow-x-auto">
        <div className="flex min-w-[420px] flex-col divide-y">
          <div className={cn("flex border-b bg-muted/50", ROW_HEIGHT)}>
            {months.map((m, i) => (
              <div
                key={i}
                style={{ width: `${m.widthPct}%` }}
                className="flex items-center justify-center border-r px-2 text-center text-xs font-medium capitalize text-muted-foreground last:border-r-0"
              >
                {m.label}
              </div>
            ))}
          </div>
          {etapas.map((etapa) => {
            const offsetDays = diffDays(parseDate(etapa.dataInicio), rangeStart);
            const durationDays = diffDays(parseDate(etapa.dataFim), parseDate(etapa.dataInicio)) + 1;
            const leftPct = (offsetDays / totalDays) * 100;
            const widthPct = Math.max((durationDays / totalDays) * 100, 2);

            return (
              <div key={etapa.id} className={cn("relative", ROW_HEIGHT)}>
                <div
                  className="absolute top-1/2 h-5 -translate-y-1/2 overflow-hidden rounded-md bg-secondary ring-1 ring-border"
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  title={`${etapa.nome}: ${formatDateShort(etapa.dataInicio)} a ${formatDateShort(etapa.dataFim)} (${etapa.progresso}%)`}
                >
                  <div className="h-full bg-primary transition-all" style={{ width: `${etapa.progresso}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
