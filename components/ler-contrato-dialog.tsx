"use client";

import { useState, useTransition } from "react";
import { lerFluxoContratoAction, criarParcelasContratoAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Sparkles, Loader2 } from "lucide-react";
import type { Arquivo } from "@/lib/types";
import type { ParcelaExtraida } from "@/lib/ocr";

type ParcelaEdit = ParcelaExtraida & { incluir: boolean };

const TIPOS_SUPORTADOS = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export function LerContratoDialog({ obraId, arquivos }: { obraId: string; arquivos: Arquivo[] }) {
  const contratos = arquivos.filter((a) => TIPOS_SUPORTADOS.has(a.mimeType));
  const [open, setOpen] = useState(false);
  const [arquivoId, setArquivoId] = useState<string>("");
  const [parcelas, setParcelas] = useState<ParcelaEdit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function resetState() {
    setParcelas(null);
    setError(null);
  }

  function handleLer() {
    if (!arquivoId) return;
    setError(null);
    startTransition(async () => {
      const res = await lerFluxoContratoAction(arquivoId);
      if (!res.ok) {
        setError(res.error);
        setParcelas(null);
        return;
      }
      setParcelas(res.parcelas.map((p) => ({ ...p, incluir: true })));
    });
  }

  function handleConfirmar() {
    if (!parcelas || !arquivoId) return;
    const selecionadas = parcelas.filter((p) => p.incluir);
    if (selecionadas.length === 0) {
      setError("Selecione ao menos uma parcela.");
      return;
    }
    startTransition(async () => {
      const res = await criarParcelasContratoAction(obraId, arquivoId, selecionadas);
      if (res.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      resetState();
      setArquivoId("");
    });
  }

  function updateParcela(idx: number, patch: Partial<ParcelaEdit>) {
    setParcelas((prev) => prev?.map((p, i) => (i === idx ? { ...p, ...patch } : p)) ?? null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          resetState();
          setArquivoId("");
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" className="gap-2" />}>
        <Sparkles className="size-4" />
        Ler contrato e gerar parcelas
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ler contrato e gerar fluxograma de pagamentos</DialogTitle>
        </DialogHeader>

        {contratos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum documento em PDF, JPG, PNG ou WEBP anexado ainda — envie o contrato na aba Documentos
            primeiro.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="contratoLer">Contrato</Label>
              <Select
                name="contratoLer"
                value={arquivoId}
                onValueChange={(v) => {
                  setArquivoId(String(v));
                  resetState();
                }}
                items={Object.fromEntries(contratos.map((a) => [a.id, a.nomeOriginal]))}
              >
                <SelectTrigger id="contratoLer" className="w-full">
                  <SelectValue placeholder="Selecione o contrato" />
                </SelectTrigger>
                <SelectContent>
                  {contratos.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nomeOriginal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!parcelas && (
              <Button onClick={handleLer} disabled={!arquivoId || pending} className="gap-2 self-start">
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {pending ? "Lendo contrato..." : "Ler contrato com IA"}
              </Button>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            {parcelas && parcelas.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-muted-foreground">
                  Confira e ajuste as parcelas identificadas antes de confirmar. Desmarque as que não
                  devem ser criadas.
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Valor (R$)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parcelas.map((p, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Checkbox
                            checked={p.incluir}
                            onCheckedChange={(v) => updateParcela(idx, { incluir: !!v })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={p.descricao}
                            onChange={(e) => updateParcela(idx, { descricao: e.target.value })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={p.data ?? ""}
                            onChange={(e) => updateParcela(idx, { data: e.target.value || null })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={p.valor}
                            onChange={(e) => updateParcela(idx, { valor: Number(e.target.value) })}
                            className="h-8 text-right"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {parcelas && parcelas.length > 0 && (
          <DialogFooter>
            <Button variant="ghost" onClick={() => resetState()} disabled={pending}>
              Ler novamente
            </Button>
            <Button onClick={handleConfirmar} disabled={pending} className="gap-2">
              {pending && <Loader2 className="size-4 animate-spin" />}
              Confirmar e adicionar {parcelas.filter((p) => p.incluir).length} parcela(s)
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
