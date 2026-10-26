"use client";

import { useActionState, useEffect, useState } from "react";
import { createOrcamentoItemAction } from "@/lib/actions";
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
import { Plus } from "lucide-react";

export function OrcamentoItemFormDialog({ obraId, orcamentoId }: { obraId: string; orcamentoId: string }) {
  const [open, setOpen] = useState(false);
  const action = createOrcamentoItemAction.bind(null, obraId, orcamentoId);
  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    if (state && !state.error) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" className="gap-2" />}>
        <Plus className="size-4" />
        Item manual
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo item de orçamento</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="tipo" value="material" />
          <div className="flex flex-col gap-2">
            <Label htmlFor="etapa">Etapa / Serviço</Label>
            <Input id="etapa" name="etapa" required placeholder="Ex: Hidráulica" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Input id="descricao" name="descricao" required placeholder="Ex: Material AF" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="valorUnitario">Valor unit. (R$)</Label>
              <Input id="valorUnitario" name="valorUnitario" type="number" min="0" step="0.01" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="quantidade">Quantidade</Label>
              <Input id="quantidade" name="quantidade" type="number" min="0" step="0.01" defaultValue={1} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="unidade">Unidade</Label>
              <Input id="unidade" name="unidade" placeholder="und" />
            </div>
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? "Adicionando..." : "Adicionar item"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
