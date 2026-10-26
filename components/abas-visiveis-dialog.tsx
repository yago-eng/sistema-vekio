"use client";

import { useState, useTransition } from "react";
import { atualizarAbasVisiveisClienteAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings2 } from "lucide-react";
import { ABAS_CLIENTE, type AbaCliente } from "@/lib/types";

export function AbasVisiveisDialog({
  clienteId,
  obraId,
  abasAtuais,
}: {
  clienteId: string;
  obraId: string;
  abasAtuais: AbaCliente[];
}) {
  const [open, setOpen] = useState(false);
  const [selecionadas, setSelecionadas] = useState<Set<AbaCliente>>(new Set(abasAtuais));
  const [pending, startTransition] = useTransition();

  function toggle(aba: AbaCliente) {
    setSelecionadas((prev) => {
      const next = new Set(prev);
      if (next.has(aba)) next.delete(aba);
      else next.add(aba);
      return next;
    });
  }

  function salvar() {
    startTransition(async () => {
      await atualizarAbasVisiveisClienteAction(clienteId, obraId, Array.from(selecionadas));
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" title="Escolher abas visíveis" />}>
        <Settings2 className="size-3.5" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abas visíveis para esse cliente</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {ABAS_CLIENTE.map((aba) => (
            <div key={aba.id} className="flex items-center gap-2">
              <Checkbox
                id={`edit-aba-${obraId}-${aba.id}`}
                checked={selecionadas.has(aba.id)}
                onCheckedChange={() => toggle(aba.id)}
              />
              <Label htmlFor={`edit-aba-${obraId}-${aba.id}`} className="font-normal">
                {aba.label}
              </Label>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={salvar} disabled={pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
