"use client";

import { useActionState, useRef } from "react";
import { createRelatorioObraAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function RelatorioObraForm({ obraId }: { obraId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const action = createRelatorioObraAction.bind(null, obraId);
  const [state, formAction, pending] = useActionState(async (
    prevState: { error?: string } | undefined,
    formData: FormData
  ) => {
    const result = await action(prevState, formData);
    if (!result.error) formRef.current?.reset();
    return result;
  }, undefined);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="dataRelatorio">Data</Label>
        <Input
          id="dataRelatorio"
          name="data"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="textoRelatorio">Relatório da semana</Label>
        <Textarea
          id="textoRelatorio"
          name="texto"
          rows={6}
          required
          placeholder="Ex: Concluída a etapa de alvenaria do 2º pavimento. Início da instalação elétrica prevista para a próxima semana..."
        />
        <p className="text-xs text-muted-foreground">
          Esse texto fica visível para o cliente na aba &quot;Relatório de obra&quot;.
        </p>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Publicando..." : "Publicar relatório"}
      </Button>
    </form>
  );
}
