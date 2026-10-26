"use client";

import { useActionState, useEffect, useState } from "react";
import { createCustoFixoAction, updateCustoFixoAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Pencil } from "lucide-react";
import { REGIOES, type CustoFixo } from "@/lib/types";

export function CustoFixoFormDialog({
  defaultRegiao,
  custoFixo,
}: {
  defaultRegiao?: string;
  custoFixo?: CustoFixo;
}) {
  const isEdit = !!custoFixo;
  const [open, setOpen] = useState(false);
  const [recorrente, setRecorrente] = useState(custoFixo?.recorrente ?? false);
  const action = isEdit
    ? updateCustoFixoAction.bind(null, custoFixo.id)
    : createCustoFixoAction;
  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    if (state && !state.error) {
      setOpen(false);
      if (!isEdit) setRecorrente(false);
    }
  }, [state, isEdit]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {isEdit ? (
        <DialogTrigger render={<Button variant="ghost" size="sm" />}>
          <Pencil className="size-3.5" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button className="gap-2" />}>
          <Plus className="size-4" />
          Novo custo fixo
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar custo fixo" : "Novo custo fixo / conta a pagar"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nome">Descrição</Label>
            <Input
              id="nome"
              name="nome"
              required
              placeholder="Ex: Aluguel do escritório"
              defaultValue={custoFixo?.nome}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="regiao">Sede</Label>
              <Select
                name="regiao"
                required
                defaultValue={custoFixo?.regiao ?? defaultRegiao}
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                name="valor"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={custoFixo?.valor}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="dataVencimento">Data de vencimento</Label>
            <Input
              id="dataVencimento"
              name="dataVencimento"
              type="date"
              required
              defaultValue={custoFixo?.dataVencimento}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="observacao">Observação (opcional)</Label>
            <Input
              id="observacao"
              name="observacao"
              placeholder="Detalhes adicionais"
              defaultValue={custoFixo?.observacao}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="recorrente"
              name="recorrente"
              checked={recorrente}
              onCheckedChange={(v) => setRecorrente(v === true)}
            />
            <Label htmlFor="recorrente" className="font-normal">
              Pagamento recorrente todo mês
            </Label>
          </div>
          {recorrente && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="diaRecorrencia">Dia do vencimento (todo mês)</Label>
              <Input
                id="diaRecorrencia"
                name="diaRecorrencia"
                type="number"
                min="1"
                max="31"
                placeholder="Ex: 5"
                required
                defaultValue={custoFixo?.diaRecorrencia ?? undefined}
              />
            </div>
          )}
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
