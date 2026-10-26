"use client";

import { useActionState, useEffect, useState } from "react";
import { updateObraDadosAction } from "@/lib/actions";
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
import { Pencil } from "lucide-react";
import { REGIOES } from "@/lib/types";
import type { Obra } from "@/lib/types";

export function EditarObraDialog({ obra }: { obra: Obra }) {
  const [open, setOpen] = useState(false);
  const action = updateObraDadosAction.bind(null, obra.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    if (state && !state.error) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="icon-sm" />}>
        <Pencil className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar dados da obra</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nome">Nome da obra</Label>
            <Input id="nome" name="nome" required defaultValue={obra.nome} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input id="endereco" name="endereco" required defaultValue={obra.endereco} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="clienteNome">Cliente</Label>
              <Input id="clienteNome" name="clienteNome" required defaultValue={obra.clienteNome} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="regiao">Cidade</Label>
              <Select
                name="regiao"
                required
                defaultValue={obra.regiao}
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
            <Label htmlFor="valorVenda">Valor de venda (R$)</Label>
            <Input
              id="valorVenda"
              name="valorVenda"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={obra.valorVenda}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="dataInicio">Data de início</Label>
            <Input id="dataInicio" name="dataInicio" type="date" required defaultValue={obra.dataInicio} />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
