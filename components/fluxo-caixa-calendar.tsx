"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PagamentoComObra, LancamentoComRegiao, CustoFixoComRegiao } from "@/lib/store";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function noMes(dataIso: string, ano: number, mes: number) {
  const [y, m] = dataIso.split("-").map(Number);
  return y === ano && m - 1 === mes;
}

export function FluxoCaixaCalendar({
  pagamentos,
  lancamentos,
  custosFixos,
}: {
  pagamentos: PagamentoComObra[];
  lancamentos: LancamentoComRegiao[];
  custosFixos: CustoFixoComRegiao[];
}) {
  const hoje = new Date();
  const hojeIso = hoje.toISOString().slice(0, 10);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());

  // Agrupa pagamentos (entradas) por dia do mês exibido
  const porDia = new Map<number, PagamentoComObra[]>();
  for (const p of pagamentos) {
    if (noMes(p.dataPrevista, ano, mes)) {
      const d = Number(p.dataPrevista.slice(8, 10));
      if (!porDia.has(d)) porDia.set(d, []);
      porDia.get(d)!.push(p);
    }
  }

  // Agrupa saídas (gastos de obra + custos fixos) por dia do mês exibido
  const saidasPorDia = new Map<number, number>();
  for (const l of lancamentos) {
    if (noMes(l.data, ano, mes)) {
      const d = Number(l.data.slice(8, 10));
      saidasPorDia.set(d, (saidasPorDia.get(d) ?? 0) + l.valor);
    }
  }
  for (const c of custosFixos) {
    if (noMes(c.dataVencimento, ano, mes)) {
      const d = Number(c.dataVencimento.slice(8, 10));
      saidasPorDia.set(d, (saidasPorDia.get(d) ?? 0) + c.valor);
    }
  }

  // Saldo projetado do mês
  const pagamentosDoMes = pagamentos.filter((p) => noMes(p.dataPrevista, ano, mes));
  const entradasConfirmadas = pagamentosDoMes.filter((p) => p.recebido).reduce((s, p) => s + p.valor, 0);
  const entradasPrevistas = pagamentosDoMes.filter((p) => !p.recebido).reduce((s, p) => s + p.valor, 0);
  const saidasObras = lancamentos
    .filter((l) => noMes(l.data, ano, mes))
    .reduce((s, l) => s + l.valor, 0);
  const saidasCustosFixos = custosFixos
    .filter((c) => noMes(c.dataVencimento, ano, mes))
    .reduce((s, c) => s + c.valor, 0);
  const totalEntradas = entradasConfirmadas + entradasPrevistas;
  const totalSaidas = saidasObras + saidasCustosFixos;
  const saldoProjetado = totalEntradas - totalSaidas;

  // Pagamentos em atraso (data passou e não foi recebido) — considerando todos, não só o mês exibido
  const emAtraso = pagamentos
    .filter((p) => !p.recebido && p.dataPrevista < hojeIso)
    .sort((a, b) => a.dataPrevista.localeCompare(b.dataPrevista));
  const totalAtraso = emAtraso.reduce((s, p) => s + p.valor, 0);

  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  const celulas: (number | null)[] = [];
  for (let i = 0; i < primeiroDia; i++) celulas.push(null);
  for (let d = 1; d <= diasNoMes; d++) celulas.push(d);

  function navegar(delta: number) {
    const novo = new Date(ano, mes + delta, 1);
    setAno(novo.getFullYear());
    setMes(novo.getMonth());
  }

  return (
    <div className="flex flex-col gap-4">
      {emAtraso.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-wrap items-center gap-3 py-4">
            <AlertTriangle className="size-5 shrink-0 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">
                {emAtraso.length} pagamento{emAtraso.length !== 1 ? "s" : ""} em atraso —{" "}
                {formatCurrency(totalAtraso)}
              </p>
              <p className="text-xs text-muted-foreground">
                {emAtraso
                  .slice(0, 3)
                  .map((p) => `${p.obraNome} (${formatDate(p.dataPrevista)})`)
                  .join(" · ")}
                {emAtraso.length > 3 && ` e mais ${emAtraso.length - 3}`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Entradas confirmadas</p>
            <p className="text-xl font-semibold">{formatCurrency(entradasConfirmadas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Entradas previstas</p>
            <p className="text-xl font-semibold">{formatCurrency(entradasPrevistas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Saídas — gastos de obra</p>
            <p className="text-xl font-semibold">{formatCurrency(saidasObras)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Saídas — custos fixos</p>
            <p className="text-xl font-semibold">{formatCurrency(saidasCustosFixos)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Saldo projetado do mês</p>
            <p
              className={cn(
                "text-xl font-semibold",
                saldoProjetado < 0 ? "text-destructive" : "text-foreground"
              )}
            >
              {formatCurrency(saldoProjetado)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => navegar(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-40 text-center font-medium">
            {MESES[mes]} {ano}
          </span>
          <Button variant="outline" size="icon-sm" onClick={() => navegar(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-primary/40" /> Entrada prevista
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-muted-foreground/40" /> Entrada recebida
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-destructive/60" /> Entrada em atraso
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-amber-500/60" /> Saídas do dia
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="py-1 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
        {celulas.map((dia, idx) => {
          if (dia === null) return <div key={`empty-${idx}`} className="min-h-24" />;
          const doDia = porDia.get(dia) ?? [];
          const saidaDoDia = saidasPorDia.get(dia) ?? 0;
          const ehHoje =
            dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear();
          const diaIso = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
          return (
            <div
              key={dia}
              className={`min-h-24 rounded-md border p-1 ${ehHoje ? "border-primary bg-primary/5" : "bg-card"}`}
            >
              <div className="mb-1 text-xs font-medium text-muted-foreground">{dia}</div>
              <div className="flex flex-col gap-1">
                {doDia.map((p) => {
                  const atrasado = !p.recebido && diaIso < hojeIso;
                  return (
                    <Link
                      key={p.id}
                      href={`/obras/${p.obraId}`}
                      className={cn(
                        "block rounded px-1 py-0.5 text-[10px] leading-tight",
                        p.recebido
                          ? "bg-muted text-muted-foreground line-through"
                          : atrasado
                            ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
                            : "bg-primary/10 text-foreground hover:bg-primary/20"
                      )}
                      title={`${p.obraNome} · ${p.descricao} · ${formatCurrency(p.valor)}${atrasado ? " · EM ATRASO" : ""}`}
                    >
                      <span className="block truncate font-medium">{p.obraNome}</span>
                      <span className="block truncate">{formatCurrency(p.valor)}</span>
                    </Link>
                  );
                })}
                {saidaDoDia > 0 && (
                  <div
                    className="block truncate rounded bg-amber-500/15 px-1 py-0.5 text-[10px] leading-tight font-medium text-amber-700 dark:text-amber-500"
                    title={`Saídas do dia (gastos de obra + custos fixos): ${formatCurrency(saidaDoDia)}`}
                  >
                    − {formatCurrency(saidaDoDia)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {pagamentos.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhum pagamento previsto cadastrado. Adicione pagamentos na aba &quot;Pagamentos&quot; de
            cada obra.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
