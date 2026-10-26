"use client";

import { Fragment, useRef, useState, useTransition } from "react";
import {
  addOrcamentoLinhaAction,
  deleteOrcamentoItemAction,
  updateOrcamentoItemTextoAction,
  updateOrcamentoItemValorAction,
} from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { FormatoItemButton } from "@/components/orcamento-formato-button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrcamentoItem } from "@/lib/types";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Remove as setinhas nativas de incrementar/decrementar dos campos numéricos
// — com valores decimais/monetários elas mais atrapalham do que ajudam.
const noSpinner =
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export function OrcamentoTable({
  obraId,
  orcamentoId,
  itens,
}: {
  obraId: string;
  orcamentoId: string;
  itens: OrcamentoItem[];
}) {
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const [novoSetor, setNovoSetor] = useState("");

  function focarProximaLinha(campo: string, indiceAtual: number) {
    const el = containerRef.current?.querySelector<HTMLInputElement>(
      `[data-campo="${campo}"][data-indice="${indiceAtual + 1}"]`
    );
    if (el) {
      el.focus();
      el.select();
    }
  }

  if (itens.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nenhum item ainda. Importe uma planilha ou adicione manualmente.
      </p>
    );
  }

  const porEtapa = new Map<string, OrcamentoItem[]>();
  for (const item of itens) {
    if (!porEtapa.has(item.etapa)) porEtapa.set(item.etapa, []);
    porEtapa.get(item.etapa)!.push(item);
  }

  const total = itens.reduce((sum, i) => sum + i.valorTotal, 0);

  function commitTexto(item: OrcamentoItem, campo: "descricao" | "unidade", raw: string) {
    const value = raw.trim();
    if (value && value !== item[campo]) {
      startTransition(() => updateOrcamentoItemTextoAction(obraId, item.id, campo, value));
    }
  }

  function commitValor(item: OrcamentoItem, campo: "valorUnitario" | "quantidade", raw: string) {
    const value = Number(raw);
    if (!Number.isNaN(value) && value !== item[campo]) {
      startTransition(() => updateOrcamentoItemValorAction(obraId, item.id, campo, value));
    }
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Descrição</TableHead>
            <TableHead className="w-28 text-right">Valor unit.</TableHead>
            <TableHead className="w-24 text-right">Qtd.</TableHead>
            <TableHead className="w-20">Und.</TableHead>
            <TableHead className="w-28 text-right">Total</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from(porEtapa.entries()).map(([etapa, items]) => {
            const subtotal = items.reduce((sum, i) => sum + i.valorTotal, 0);
            return (
              <Fragment key={etapa}>
                <TableRow className="bg-muted/60 hover:bg-muted/60">
                  <TableCell colSpan={6} className="py-2 text-base font-bold">
                    {etapa}
                  </TableCell>
                </TableRow>
                {items.map((item) => {
                  const indice = itens.findIndex((i) => i.id === item.id);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="align-top">
                        <div className="flex items-center gap-1">
                          <Input
                            data-campo="descricao"
                            data-indice={indice}
                            defaultValue={item.descricao}
                            className="h-7 text-sm"
                            style={{
                              color: item.cor ?? undefined,
                              fontWeight: item.negrito ? 700 : undefined,
                            }}
                            onBlur={(e) => commitTexto(item, "descricao", e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key !== "Enter") return;
                              e.preventDefault();
                              commitTexto(item, "descricao", e.currentTarget.value);
                              focarProximaLinha("descricao", indice);
                            }}
                          />
                          <FormatoItemButton
                            obraId={obraId}
                            itemId={item.id}
                            negrito={item.negrito}
                            cor={item.cor}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">R$</span>
                          <Input
                            data-campo="valorUnitario"
                            data-indice={indice}
                            type="number"
                            step="0.01"
                            defaultValue={item.valorUnitario}
                            className={cn("h-7 text-right text-sm", noSpinner)}
                            onBlur={(e) => commitValor(item, "valorUnitario", e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key !== "Enter") return;
                              e.preventDefault();
                              commitValor(item, "valorUnitario", e.currentTarget.value);
                              focarProximaLinha("valorUnitario", indice);
                            }}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          data-campo="quantidade"
                          data-indice={indice}
                          type="number"
                          step="0.01"
                          defaultValue={item.quantidade}
                          className={cn("h-7 text-right text-sm", noSpinner)}
                          onBlur={(e) => commitValor(item, "quantidade", e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter") return;
                            e.preventDefault();
                            commitValor(item, "quantidade", e.currentTarget.value);
                            focarProximaLinha("quantidade", indice);
                          }}
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          data-campo="unidade"
                          data-indice={indice}
                          defaultValue={item.unidade}
                          className="h-7 text-sm"
                          onBlur={(e) => commitTexto(item, "unidade", e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter") return;
                            e.preventDefault();
                            commitTexto(item, "unidade", e.currentTarget.value);
                            focarProximaLinha("unidade", indice);
                          }}
                        />
                      </TableCell>
                      <TableCell className="align-top text-right text-sm font-medium">
                        {formatCurrency(item.valorTotal)}
                      </TableCell>
                      <TableCell className="align-top">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={isPending}
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => startTransition(() => deleteOrcamentoItemAction(obraId, item.id))}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="py-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      className="h-7 gap-1 text-xs text-muted-foreground"
                      onClick={() => startTransition(() => addOrcamentoLinhaAction(obraId, orcamentoId, etapa))}
                    >
                      <Plus className="size-3.5" />
                      Adicionar linha em {etapa}
                    </Button>
                  </TableCell>
                  <TableCell />
                </TableRow>
                <TableRow className="border-t-2 hover:bg-transparent">
                  <TableCell colSpan={4} className="py-2 text-right text-sm text-muted-foreground">
                    Subtotal
                  </TableCell>
                  <TableCell className="py-2 text-right text-base font-bold">
                    {formatCurrency(subtotal)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
      <form
        className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-3"
        onSubmit={(e) => {
          e.preventDefault();
          const nome = novoSetor.trim();
          if (!nome) return;
          startTransition(() => addOrcamentoLinhaAction(obraId, orcamentoId, nome));
          setNovoSetor("");
        }}
      >
        <Input
          value={novoSetor}
          onChange={(e) => setNovoSetor(e.target.value)}
          placeholder="Nome do novo setor (ex.: Marcenaria)"
          className="h-8 min-w-48 flex-1 text-sm"
        />
        <Button type="submit" size="sm" variant="outline" disabled={isPending || !novoSetor.trim()} className="gap-1">
          <Plus className="size-3.5" />
          Adicionar setor
        </Button>
      </form>
      <div className="flex items-center justify-end gap-2 border-t pt-3 text-sm font-semibold">
        Custo da obra: {formatCurrency(total)}
      </div>
    </div>
  );
}
