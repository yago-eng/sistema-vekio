"use client";

import { useTransition } from "react";
import {
  deletePagamentoAction,
  updatePagamentoDataAction,
  updatePagamentoRecebidoAction,
} from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, Trash2, Undo2, FileText } from "lucide-react";
import type { Arquivo, Pagamento } from "@/lib/types";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PagamentoList({
  obraId,
  pagamentos,
  arquivos,
  valorContrato,
}: {
  obraId: string;
  pagamentos: Pagamento[];
  arquivos: Arquivo[];
  valorContrato: number;
}) {
  const [pending, startTransition] = useTransition();
  const arquivoNome = (id: string | null) => (id ? arquivos.find((a) => a.id === id)?.nomeOriginal : null);

  const totalRecebido = pagamentos.filter((p) => p.recebido).reduce((s, p) => s + p.valor, 0);
  const percentual = valorContrato > 0 ? (totalRecebido / valorContrato) * 100 : 0;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div>
            <p className="text-sm text-muted-foreground">Recebido do cliente</p>
            <p className="text-2xl font-semibold">
              {formatCurrency(totalRecebido)}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                de {formatCurrency(valorContrato)} ({percentual.toFixed(1)}%)
              </span>
            </p>
          </div>
          <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted sm:w-48">
            <div
              className="h-full bg-primary"
              style={{ width: `${Math.min(100, percentual)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {pagamentos.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nenhum pagamento previsto ainda.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Data prevista</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagamentos.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="min-w-[12rem] font-medium whitespace-normal break-words">
                  {p.descricao}
                  {arquivoNome(p.arquivoId) && (
                    <a
                      href={`/arquivo/${p.arquivoId}`}
                      className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                    >
                      <FileText className="size-3" />
                      {arquivoNome(p.arquivoId)}
                    </a>
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    key={p.dataPrevista}
                    type="date"
                    defaultValue={p.dataPrevista}
                    disabled={pending}
                    title="Clique para ajustar a data"
                    className="h-8 w-36 text-sm"
                    onBlur={(e) => {
                      const v = e.target.value;
                      if (v && v !== p.dataPrevista) {
                        startTransition(() => updatePagamentoDataAction(obraId, p.id, v));
                      }
                    }}
                  />
                </TableCell>
                <TableCell className="text-right">{formatCurrency(p.valor)}</TableCell>
                <TableCell>
                  <Badge variant={p.recebido ? "outline" : "secondary"}>
                    {p.recebido ? "Recebido" : "A receber"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    {p.recebido ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        className="gap-1"
                        onClick={() =>
                          startTransition(() => updatePagamentoRecebidoAction(obraId, p.id, false))
                        }
                      >
                        <Undo2 className="size-3.5" />
                        Reabrir
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        className="gap-1"
                        onClick={() =>
                          startTransition(() => updatePagamentoRecebidoAction(obraId, p.id, true))
                        }
                      >
                        <Check className="size-3.5" />
                        Marcar recebido
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => startTransition(() => deletePagamentoAction(obraId, p.id))}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
