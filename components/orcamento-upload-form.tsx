"use client";

import { useActionState, useRef } from "react";
import { importOrcamentoAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload } from "lucide-react";
import { toast } from "sonner";

export function OrcamentoUploadForm({ obraId, orcamentoId }: { obraId: string; orcamentoId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const action = importOrcamentoAction.bind(null, obraId, orcamentoId);
  const [state, formAction, pending] = useActionState(async (
    prevState: { error?: string; importados?: number } | undefined,
    formData: FormData
  ) => {
    const result = await action(prevState, formData);
    if (result.importados) {
      toast.success(`${result.importados} itens importados da planilha.`);
      formRef.current?.reset();
    }
    return result;
  }, undefined);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="arquivo">Planilha Excel (.xlsx)</Label>
        <input
          id="arquivo"
          name="arquivo"
          type="file"
          accept=".xlsx,.xls"
          required
          className="rounded-lg border border-input bg-transparent text-sm file:mr-3 file:h-8 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:text-sm file:font-medium file:text-secondary-foreground"
        />
        <p className="text-xs text-muted-foreground">
          Reconhece abas com colunas Serviço/Material ou Serviço/Equipe (padrão da planilha da Vekio).
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="substituir" name="substituir" defaultChecked />
        <Label htmlFor="substituir" className="text-sm font-normal text-muted-foreground">
          Substituir itens já existentes desta obra (desmarque só se quiser somar em cima dos atuais)
        </Label>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="gap-2">
        <Upload className="size-4" />
        {pending ? "Importando..." : "Importar planilha"}
      </Button>
    </form>
  );
}
