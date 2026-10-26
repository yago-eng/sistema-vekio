"use client";

import { useActionState, useEffect, useState } from "react";
import { createOrcamentoPropostaAction } from "@/lib/actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { REGIOES } from "@/lib/types";

export function OrcamentoPropostaFormDialog({ defaultRegiao }: { defaultRegiao?: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createOrcamentoPropostaAction, undefined);

  useEffect(() => {
    if (state && !state.error) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus className="size-4" />
        Nova proposta
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova proposta de orçamento</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nome">Nome da obra / projeto</Label>
            <Input id="nome" name="nome" required placeholder="Ex: Apto João Silva" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="clienteNome">Cliente</Label>
              <Input id="clienteNome" name="clienteNome" required placeholder="Nome do cliente" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="regiao">Cidade</Label>
              <Select
                name="regiao"
                required
                defaultValue={defaultRegiao}
                items={Object.fromEntries(REGIOES.map((r) => [r, r]))}
              >
                <SelectTrigger id="regiao" className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {REGIOES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="dataInicio">Data da proposta</Label>
            <Input id="dataInicio" name="dataInicio" type="date" required />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? "Criando..." : "Criar proposta"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
