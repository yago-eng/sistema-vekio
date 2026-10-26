"use client";

import { useState, useTransition } from "react";
import { replicarCustosFixosAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Copy, Loader2 } from "lucide-react";
import type { CustoFixo } from "@/lib/types";

const MESES_ABREV = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export function ReplicarCustosFixosDialog({
  selecionados,
  onDone,
}: {
  selecionados: CustoFixo[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [meses, setMeses] = useState<Set<number>>(new Set());
  const [anosAdicionais, setAnosAdicionais] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggleMes(m: number) {
    setMeses((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  }

  function handleConfirmar() {
    setError(null);
    const itens = selecionados.map((c) => ({
      nome: c.nome,
      regiao: c.regiao,
      valor: c.valor,
      observacao: c.observacao,
      recorrente: c.recorrente,
      diaRecorrencia: c.diaRecorrencia,
      dia: Number(c.dataVencimento.slice(8, 10)),
      mesOrigem: Number(c.dataVencimento.slice(5, 7)),
      anoOrigem: Number(c.dataVencimento.slice(0, 4)),
    }));

    startTransition(async () => {
      const res = await replicarCustosFixosAction(itens, Array.from(meses), anosAdicionais);
      if (res.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      setMeses(new Set());
      setAnosAdicionais(0);
      onDone();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setError(null);
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline" className="gap-2" />}>
        <Copy className="size-4" />
        Replicar {selecionados.length} custo(s) fixo(s)
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Replicar custos fixos</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Meses de destino</Label>
            <div className="grid grid-cols-4 gap-2">
              {MESES_ABREV.map((label, i) => {
                const m = i + 1;
                return (
                  <label
                    key={m}
                    className="flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-sm has-[[data-checked]]:border-primary"
                  >
                    <Checkbox checked={meses.has(m)} onCheckedChange={() => toggleMes(m)} />
                    {label}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="anosAdicionais">Repetir também nos próximos N anos</Label>
            <Input
              id="anosAdicionais"
              type="number"
              min="0"
              max="10"
              value={anosAdicionais}
              onChange={(e) => setAnosAdicionais(Math.max(0, Number(e.target.value)))}
              className="w-24"
            />
            <p className="text-xs text-muted-foreground">
              0 = replica só dentro do ano de origem de cada custo selecionado.
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button onClick={handleConfirmar} disabled={pending || meses.size === 0} className="gap-2">
            {pending && <Loader2 className="size-4 animate-spin" />}
            {pending ? "Replicando..." : "Confirmar replicação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
