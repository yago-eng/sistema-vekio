"use client";

import { useTransition } from "react";
import { updateObraPipelineStatusAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

export function PipelineStatusActions({ obraId }: { obraId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3">
      <p className="flex-1 text-sm text-muted-foreground">
        Esta é uma proposta de orçamento em andamento — ainda não é uma obra ativa.
      </p>
      <Button
        size="sm"
        disabled={pending}
        className="gap-1"
        onClick={() => startTransition(() => updateObraPipelineStatusAction(obraId, "efetivado"))}
      >
        <Check className="size-4" />
        Marcar como efetivado
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        className="gap-1"
        onClick={() => startTransition(() => updateObraPipelineStatusAction(obraId, "negado"))}
      >
        <X className="size-4" />
        Marcar como negado
      </Button>
    </div>
  );
}
