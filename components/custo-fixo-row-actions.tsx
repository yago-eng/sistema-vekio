"use client";

import { useTransition } from "react";
import { deleteCustoFixoAction, updateCustoFixoStatusAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { CustoFixoFormDialog } from "@/components/custo-fixo-form-dialog";
import type { CustoFixo } from "@/lib/types";
import { Check, Trash2, Undo2 } from "lucide-react";

export function CustoFixoRowActions({ custoFixo }: { custoFixo: CustoFixo }) {
  const [pending, startTransition] = useTransition();
  const { id, status } = custoFixo;

  return (
    <div className="flex items-center justify-end gap-1">
      {status === "pendente" ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          className="gap-1"
          onClick={() => startTransition(() => updateCustoFixoStatusAction(id, "pago"))}
        >
          <Check className="size-3.5" />
          Marcar pago
        </Button>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          className="gap-1"
          onClick={() => startTransition(() => updateCustoFixoStatusAction(id, "pendente"))}
        >
          <Undo2 className="size-3.5" />
          Reabrir
        </Button>
      )}
      <CustoFixoFormDialog custoFixo={custoFixo} />
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => startTransition(() => deleteCustoFixoAction(id))}
      >
        <Trash2 className="size-3.5 text-destructive" />
      </Button>
    </div>
  );
}
