"use client";

import { useTransition } from "react";
import { deleteRelatorioObraAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { RelatorioObra } from "@/lib/types";

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function RelatorioObraList({
  obraId,
  relatorios,
}: {
  obraId: string;
  relatorios: RelatorioObra[];
}) {
  const [pending, startTransition] = useTransition();

  if (relatorios.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nenhum relatório publicado ainda.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {relatorios.map((r) => (
        <div key={r.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
          <div className="flex-1">
            <p className="text-sm font-medium">{formatDate(r.data)}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{r.texto}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={pending}
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => startTransition(() => deleteRelatorioObraAction(obraId, r.id))}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
