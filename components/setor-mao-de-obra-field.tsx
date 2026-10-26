"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SETORES_MAO_DE_OBRA } from "@/lib/types";

const SEM_SETOR = "sem-setor";

const ITEMS: Record<string, string> = {
  [SEM_SETOR]: "Sem setor definido",
  ...Object.fromEntries(SETORES_MAO_DE_OBRA.map((s) => [s, s])),
};

// Só aparece quando a categoria escolhida é "Mão de obra" — o relatório
// financeiro da obra usa isso pra separar quanto foi gasto em cada setor.
export function SetorMaoDeObraField({ id, defaultValue }: { id: string; defaultValue?: string | null }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Setor da mão de obra</Label>
      <Select name="setor" defaultValue={defaultValue || SEM_SETOR} items={ITEMS}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(ITEMS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
