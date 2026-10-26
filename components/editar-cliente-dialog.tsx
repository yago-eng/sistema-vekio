"use client";

import { useActionState, useEffect, useState } from "react";
import { updateClienteNomeAction } from "@/lib/actions";
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
import { Pencil } from "lucide-react";

export function EditarClienteDialog({
  clienteId,
  obraId,
  nome,
  email,
}: {
  clienteId: string;
  obraId?: string;
  nome: string;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  const action = updateClienteNomeAction.bind(null, clienteId, obraId ?? null);
  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    if (state && !state.error) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <Pencil className="size-3.5" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar cliente</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`nome-cliente-${clienteId}`}>Nome</Label>
            <Input id={`nome-cliente-${clienteId}`} name="nome" required defaultValue={nome} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>E-mail</Label>
            <Input value={email} disabled />
            <p className="text-xs text-muted-foreground">
              O e-mail está vinculado ao login do cliente e não pode ser alterado por aqui — remova e
              convide novamente se precisar trocar.
            </p>
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
