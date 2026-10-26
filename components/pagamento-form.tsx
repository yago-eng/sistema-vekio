"use client";

import { useActionState, useRef, useEffect } from "react";
import { createPagamentoAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Arquivo } from "@/lib/types";

export function PagamentoForm({ obraId, arquivos }: { obraId: string; arquivos: Arquivo[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const action = createPagamentoAction.bind(null, obraId);
  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    if (state && !state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="descricaoPag">Descrição</Label>
        <Input id="descricaoPag" name="descricao" required placeholder="Ex: Entrada / Parcela 1" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="valorPag">Valor (R$)</Label>
          <Input id="valorPag" name="valor" type="number" min="0" step="0.01" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dataPrevista">Data prevista</Label>
          <Input id="dataPrevista" name="dataPrevista" type="date" required />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="arquivoId">Contrato vinculado (opcional)</Label>
        {arquivos.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhum documento anexado ainda — envie o contrato na aba Documentos para poder vincular.
          </p>
        ) : (
          <Select
            name="arquivoId"
            items={{ "": "Nenhum", ...Object.fromEntries(arquivos.map((a) => [a.id, a.nomeOriginal])) }}
          >
            <SelectTrigger id="arquivoId" className="w-full">
              <SelectValue placeholder="Nenhum" />
            </SelectTrigger>
            <SelectContent>
              {arquivos.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.nomeOriginal}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="recebido" name="recebido" />
        <Label htmlFor="recebido" className="font-normal">
          Já recebido (dar baixa agora)
        </Label>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Adicionando..." : "Adicionar pagamento"}
      </Button>
    </form>
  );
}
