"use client";

import { useActionState, useEffect, useRef } from "react";
import { createDataImportanteAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

export function DataImportanteForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(createDataImportanteAction, undefined);

  useEffect(() => {
    if (state && !state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="titulo">Título</Label>
        <Input id="titulo" name="titulo" required placeholder="Ex: Vencimento alvará" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="descricao">Descrição (opcional)</Label>
        <Textarea id="descricao" name="descricao" rows={2} placeholder="Detalhes" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="data">Data</Label>
          <Input id="data" name="data" type="date" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="alertaDiasAntes">Avisar quantos dias antes</Label>
          <Input
            id="alertaDiasAntes"
            name="alertaDiasAntes"
            type="number"
            min="0"
            max="60"
            defaultValue={3}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="recorrente" name="recorrente" />
        <Label htmlFor="recorrente" className="font-normal">
          Recorrente (repete todo ano, ex: aniversário)
        </Label>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Adicionar data"}
      </Button>
    </form>
  );
}
