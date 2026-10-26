"use client";

import { useState, useTransition } from "react";
import { aplicarValorVendaCalculadoAction, updateOrcamentoParametrosAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { OrcamentoParametros } from "@/lib/types";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcular(
  custoDaObra: number,
  params: Pick<OrcamentoParametros, "margemVekio" | "rt" | "imposto" | "lucratividadeEsperada">
) {
  const baseCalculo = custoDaObra * (1 + params.margemVekio / 100);
  const divisor = 1 - params.rt / 100 - params.imposto / 100;
  const valorVenda = divisor > 0 ? baseCalculo / divisor : 0;
  const rtValor = valorVenda * (params.rt / 100);
  const impostoValor = valorVenda * (params.imposto / 100);
  const margemReal = valorVenda - custoDaObra - rtValor - impostoValor;
  const margemRealPercentual = valorVenda > 0 ? (margemReal / valorVenda) * 100 : 0;
  const aproximacaoMeta = margemRealPercentual - params.lucratividadeEsperada;
  return { baseCalculo, valorVenda, rtValor, impostoValor, margemReal, margemRealPercentual, aproximacaoMeta };
}

export function OrcamentoPrecificacao({
  obraId,
  orcamentoId,
  custoDaObra,
  parametrosIniciais,
}: {
  obraId: string;
  orcamentoId: string;
  custoDaObra: number;
  parametrosIniciais: OrcamentoParametros;
}) {
  const [isPending, startTransition] = useTransition();
  const [params, setParams] = useState({
    margemVekio: parametrosIniciais.margemVekio,
    rt: parametrosIniciais.rt,
    imposto: parametrosIniciais.imposto,
    lucratividadeEsperada: parametrosIniciais.lucratividadeEsperada,
  });
  const [custoSimulado, setCustoSimulado] = useState(custoDaObra);
  const simulando = Math.round(custoSimulado * 100) !== Math.round(custoDaObra * 100);

  const resultado = calcular(custoSimulado, params);

  function handleChange(field: keyof typeof params, value: number) {
    setParams((p) => ({ ...p, [field]: value }));
    startTransition(() => updateOrcamentoParametrosAction(obraId, orcamentoId, field, value));
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="margemVekio">Margem Vekio (%)</Label>
            <Input
              id="margemVekio"
              type="number"
              step="0.01"
              defaultValue={params.margemVekio}
              onBlur={(e) => handleChange("margemVekio", Number(e.target.value))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="rt">RT (%)</Label>
            <Input
              id="rt"
              type="number"
              step="0.01"
              defaultValue={params.rt}
              onBlur={(e) => handleChange("rt", Number(e.target.value))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="imposto">Imposto (%)</Label>
            <Input
              id="imposto"
              type="number"
              step="0.01"
              defaultValue={params.imposto}
              onBlur={(e) => handleChange("imposto", Number(e.target.value))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="lucratividadeEsperada">Lucratividade esperada (%)</Label>
            <Input
              id="lucratividadeEsperada"
              type="number"
              step="0.01"
              defaultValue={params.lucratividadeEsperada}
              onBlur={(e) => handleChange("lucratividadeEsperada", Number(e.target.value))}
            />
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await aplicarValorVendaCalculadoAction(obraId, orcamentoId);
              toast.success("Valor de venda da obra atualizado.");
            })
          }
        >
          Aplicar valor de venda calculado à obra
        </Button>
      </div>

      <div className="flex flex-col gap-1.5 rounded-lg border p-4 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("text-muted-foreground", simulando && "text-foreground")}>
            Custo da obra {simulando && "(simulação)"}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">R$</span>
            <Input
              type="number"
              step="0.01"
              value={custoSimulado}
              onChange={(e) => setCustoSimulado(Number(e.target.value))}
              className="h-7 w-32 text-right text-sm"
            />
          </div>
        </div>
        {simulando && (
          <button
            type="button"
            onClick={() => setCustoSimulado(custoDaObra)}
            className="mb-1 self-end text-xs text-muted-foreground underline hover:text-foreground"
          >
            voltar ao custo real ({formatCurrency(custoDaObra)})
          </button>
        )}
        <Row label="Base de cálculo" value={formatCurrency(resultado.baseCalculo)} muted />
        <Row label="RT" value={formatCurrency(resultado.rtValor)} muted />
        <Row label="Imposto" value={formatCurrency(resultado.impostoValor)} muted />
        <div className="my-1 border-t" />
        <Row label="Valor de venda" value={formatCurrency(resultado.valorVenda)} strong />
        <Row
          label="Margem real"
          value={formatCurrency(resultado.margemReal)}
          className={resultado.margemReal < 0 ? "text-destructive" : undefined}
        />
        <Row label="Margem real %" value={`${resultado.margemRealPercentual.toFixed(2)}%`} />
        <Row
          label="Aproximação da meta"
          value={`${resultado.aproximacaoMeta >= 0 ? "+" : ""}${resultado.aproximacaoMeta.toFixed(2)}%`}
          muted
        />
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  strong,
  className,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
  className?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn("text-muted-foreground", strong && "font-medium text-foreground")}>{label}</span>
      <span
        className={cn(
          muted && "text-muted-foreground",
          strong && "text-base font-semibold text-foreground",
          className
        )}
      >
        {value}
      </span>
    </div>
  );
}
