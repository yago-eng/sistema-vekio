"use client";

import { useActionState, useEffect, useState } from "react";
import { createEtapaAction } from "@/lib/actions";
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

export function EtapaFormDialog({ obraId }: { obraId: string }) {
  const [open, setOpen] = useState(false);
  const action = createEtapaAction.bind(null, obraId);
  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    if (state && !state.error) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="gap-2" />}>
        <Plus className="size-4" />
        Nova etapa
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova etapa do cronograma</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nome">Nome da etapa</Label>
            <Input id="nome" name="nome" required placeholder="Ex: Fundação" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="dataInicio">Início</Label>
              <Input id="dataInicio" name="dataInicio" type="date" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="dataFim">Fim</Label>
              <Input id="dataFim" name="dataFim" type="date" required />
            </div>
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? "Criando..." : "Criar etapa"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
