"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { updateLancamentoAction, deleteLancamentoAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { FornecedorInput } from "@/components/fornecedor-input";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";
import { SetorMaoDeObraField } from "@/components/setor-mao-de-obra-field";
import { CATEGORIA_MAO_DE_OBRA, type Categoria, type Lancamento } from "@/lib/types";

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}
function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function EditLancamentoDialog({
  obraId,
  lancamento,
  categorias,
}: {
  obraId: string;
  lancamento: Lancamento;
  categorias: Categoria[];
}) {
  const [open, setOpen] = useState(false);
  const [categoriaId, setCategoriaId] = useState(lancamento.categoriaId);
  const action = updateLancamentoAction.bind(null, obraId, lancamento.id);
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
          <DialogTitle>Editar lançamento</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`categoriaId-${lancamento.id}`}>Categoria</Label>
            <Select
              name="categoriaId"
              required
              value={categoriaId}
              onValueChange={(v) => setCategoriaId(v as string)}
              items={Object.fromEntries(categorias.map((c) => [c.id, c.nome]))}
            >
              <SelectTrigger id={`categoriaId-${lancamento.id}`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {categorias.find((c) => c.id === categoriaId)?.nome === CATEGORIA_MAO_DE_OBRA && (
            <SetorMaoDeObraField id={`setor-${lancamento.id}`} defaultValue={lancamento.setor} />
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`valor-${lancamento.id}`}>Valor (R$)</Label>
              <Input
                id={`valor-${lancamento.id}`}
                name="valor"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={lancamento.valor}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`data-${lancamento.id}`}>Data</Label>
              <Input
                id={`data-${lancamento.id}`}
                name="data"
                type="date"
                required
                defaultValue={lancamento.data}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`descricao-${lancamento.id}`}>Descrição</Label>
            <Input
              id={`descricao-${lancamento.id}`}
              name="descricao"
              required
              defaultValue={lancamento.descricao}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`fornecedor-${lancamento.id}`}>Fornecedor</Label>
            <FornecedorInput
              id={`fornecedor-${lancamento.id}`}
              name="fornecedor"
              defaultValue={lancamento.fornecedor ?? ""}
            />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function LancamentoList({
  obraId,
  lancamentos,
  categorias,
}: {
  obraId: string;
  lancamentos: Lancamento[];
  categorias: Categoria[];
}) {
  const [pending, startTransition] = useTransition();
  const categoriaNome = (id: string) => categorias.find((c) => c.id === id)?.nome ?? "—";

  if (lancamentos.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">Nenhum lançamento ainda.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Categoria</TableHead>
          <TableHead>Fornecedor</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead className="text-right">Valor</TableHead>
          <TableHead className="w-20 text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lancamentos.map((l) => (
          <TableRow key={l.id}>
            <TableCell>{formatDate(l.data)}</TableCell>
            <TableCell>{categoriaNome(l.categoriaId)}</TableCell>
            <TableCell className="whitespace-normal">{l.fornecedor || "—"}</TableCell>
            <TableCell className="max-w-[18rem] min-w-[12rem] whitespace-normal break-words">{l.descricao}</TableCell>
            <TableCell className="text-right font-medium">{formatCurrency(l.valor)}</TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-1">
                <EditLancamentoDialog obraId={obraId} lancamento={l} categorias={categorias} />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={pending}
                  onClick={() => startTransition(() => deleteLancamentoAction(obraId, l.id))}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
