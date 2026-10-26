"use client";

import { useTransition } from "react";
import { moverObraParaOrcamentoAction, updateObraStatusAction } from "@/lib/actions";
import { OBRA_STATUS, type ObraStatus } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EM_ORCAMENTO = "__em_orcamento__";

export function ObraStatusSelect({ obraId, status }: { obraId: string; status: ObraStatus }) {
  const [pending, startTransition] = useTransition();

  const items = {
    ...Object.fromEntries(OBRA_STATUS.map((s) => [s.id, s.label])),
    [EM_ORCAMENTO]: "Em orçamento",
  };

  return (
    <Select
      value={status}
      disabled={pending}
      items={items}
      onValueChange={(value) => {
        const v = String(value);
        startTransition(() => {
          if (v === EM_ORCAMENTO) {
            moverObraParaOrcamentoAction(obraId);
          } else {
            updateObraStatusAction(obraId, v as ObraStatus);
          }
        });
      }}
    >
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OBRA_STATUS.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.label}
          </SelectItem>
        ))}
        <SelectItem value={EM_ORCAMENTO}>Em orçamento</SelectItem>
      </SelectContent>
    </Select>
  );
}
