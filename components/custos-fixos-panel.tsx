"use client";

import { Fragment, useState } from "react";
import { REGIOES, type CustoFixo } from "@/lib/types";
import { CustoFixoFormDialog } from "@/components/custo-fixo-form-dialog";
import { CustoFixoRowActions } from "@/components/custo-fixo-row-actions";
import { ReplicarCustosFixosDialog } from "@/components/replicar-custos-fixos-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function CustosFixosPanel({ custos }: { custos: CustoFixo[] }) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  function toggleSelecionado(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const itensSelecionados = custos.filter((c) => selecionados.has(c.id));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Contas a pagar mensais de cada sede</p>
        <div className="flex items-center gap-2">
          {itensSelecionados.length > 0 && (
            <ReplicarCustosFixosDialog
              selecionados={itensSelecionados}
              onDone={() => setSelecionados(new Set())}
            />
          )}
          <CustoFixoFormDialog />
        </div>
      </div>

      <Tabs defaultValue={REGIOES[0]}>
        <TabsList>
          {REGIOES.map((r) => (
            <TabsTrigger key={r} value={r}>
              {r}
            </TabsTrigger>
          ))}
        </TabsList>

        {REGIOES.map((regiao) => {
          const daRegiao = custos.filter((c) => c.regiao === regiao);
          const anos = Array.from(
            new Set(daRegiao.map((c) => c.dataVencimento.slice(0, 4)))
          ).sort((a, b) => Number(a) - Number(b));
          const anoAtual = String(new Date().getFullYear());
          const defaultAno = anos.includes(anoAtual) ? anoAtual : anos[0];

          const recorrentesDaRegiao = daRegiao.filter((c) => c.recorrente);
          const chaveAnoMes = (c: CustoFixo) => c.dataVencimento.slice(0, 7);
          const hoje = new Date();
          const chaveAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
          let recorrentesMesRef = recorrentesDaRegiao.filter((c) => chaveAnoMes(c) === chaveAtual);
          let mesRefLabel = "neste mês";
          if (recorrentesMesRef.length === 0 && recorrentesDaRegiao.length > 0) {
            const chaves = Array.from(new Set(recorrentesDaRegiao.map(chaveAnoMes))).sort();
            const chaveMaisRecente = chaves[chaves.length - 1];
            recorrentesMesRef = recorrentesDaRegiao.filter((c) => chaveAnoMes(c) === chaveMaisRecente);
            const [anoRef, mesRef] = chaveMaisRecente.split("-").map(Number);
            mesRefLabel = `em ${MESES[mesRef - 1].toLowerCase()}/${anoRef}`;
          }
          const totalRecorrenteMensal = recorrentesMesRef.reduce((s, c) => s + c.valor, 0);

          return (
            <TabsContent key={regiao} value={regiao} className="flex flex-col gap-4">
              {daRegiao.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-sm text-muted-foreground">
                    Nenhum custo fixo cadastrado em {regiao} ainda.
                  </CardContent>
                </Card>
              ) : (
                <>
                  {recorrentesMesRef.length > 0 && (
                    <Card className="border-primary/30 bg-primary/5">
                      <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Custo fixo recorrente · {recorrentesMesRef.length}{" "}
                            {recorrentesMesRef.length === 1 ? "conta" : "contas"} {mesRefLabel}
                          </p>
                          <p className="text-2xl font-semibold">
                            {formatCurrency(totalRecorrenteMensal)}{" "}
                            <span className="text-sm font-normal text-muted-foreground">/ mês</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Projeção anual</p>
                          <p className="text-lg font-semibold">
                            {formatCurrency(totalRecorrenteMensal * 12)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <Tabs defaultValue={defaultAno}>
                  <TabsList>
                    {anos.map((ano) => (
                      <TabsTrigger key={ano} value={ano}>
                        {ano}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {anos.map((ano) => {
                    const doAno = daRegiao.filter((c) => c.dataVencimento.slice(0, 4) === ano);
                    const totalPendente = doAno
                      .filter((c) => c.status === "pendente")
                      .reduce((s, c) => s + c.valor, 0);
                    const totalPago = doAno
                      .filter((c) => c.status === "pago")
                      .reduce((s, c) => s + c.valor, 0);
                    const totalRecorrenteAno = doAno
                      .filter((c) => c.recorrente)
                      .reduce((s, c) => s + c.valor, 0);
                    const totalPontualAno = doAno
                      .filter((c) => !c.recorrente)
                      .reduce((s, c) => s + c.valor, 0);

                    // agrupa por mês
                    const porMes = new Map<number, CustoFixo[]>();
                    for (const c of doAno) {
                      const m = Number(c.dataVencimento.slice(5, 7)) - 1;
                      if (!porMes.has(m)) porMes.set(m, []);
                      porMes.get(m)!.push(c);
                    }
                    const mesesOrdenados = Array.from(porMes.keys()).sort((a, b) => a - b);

                    return (
                      <TabsContent key={ano} value={ano} className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total pendente
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="text-2xl font-semibold">
                              {formatCurrency(totalPendente)}
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total pago
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="text-2xl font-semibold">
                              {formatCurrency(totalPago)}
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total do ano
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-2xl font-semibold">
                                {formatCurrency(totalPendente + totalPago)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(totalRecorrenteAno)} recorrente ·{" "}
                                {formatCurrency(totalPontualAno)} pontual
                              </p>
                            </CardContent>
                          </Card>
                        </div>

                        <Card>
                          <CardContent className="pt-6">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-8"></TableHead>
                                  <TableHead>Descrição</TableHead>
                                  <TableHead>Vencimento</TableHead>
                                  <TableHead className="text-right">Valor</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {mesesOrdenados.map((m) => {
                                  const doMes = porMes.get(m)!;
                                  const totalMes = doMes.reduce((s, c) => s + c.valor, 0);
                                  return (
                                    <Fragment key={m}>
                                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                                        <TableCell />
                                        <TableCell colSpan={2} className="py-1.5 text-sm font-semibold">
                                          {MESES[m]}
                                        </TableCell>
                                        <TableCell className="py-1.5 text-right text-sm font-semibold">
                                          {formatCurrency(totalMes)}
                                        </TableCell>
                                        <TableCell colSpan={2} />
                                      </TableRow>
                                      {doMes.map((c) => (
                                        <TableRow key={c.id}>
                                          <TableCell>
                                            <Checkbox
                                              checked={selecionados.has(c.id)}
                                              onCheckedChange={() => toggleSelecionado(c.id)}
                                            />
                                          </TableCell>
                                          <TableCell className="font-medium">
                                            {c.nome}
                                            {c.observacao && (
                                              <p className="text-xs font-normal text-muted-foreground">
                                                {c.observacao}
                                              </p>
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {formatDate(c.dataVencimento)}
                                            {c.recorrente && c.diaRecorrencia && (
                                              <p className="text-xs font-normal text-muted-foreground">
                                                Recorrente · todo dia {c.diaRecorrencia}
                                              </p>
                                            )}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            {formatCurrency(c.valor)}
                                          </TableCell>
                                          <TableCell>
                                            <Badge
                                              variant={c.status === "pago" ? "outline" : "secondary"}
                                              className={cn(
                                                c.status === "pendente" &&
                                                  "text-amber-700 dark:text-amber-500"
                                              )}
                                            >
                                              {c.status === "pago" ? "Pago" : "Pendente"}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>
                                            <CustoFixoRowActions custoFixo={c} />
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </Fragment>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    );
                  })}
                  </Tabs>
                </>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
