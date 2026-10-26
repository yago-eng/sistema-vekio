"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createOrcamentoAction, deleteOrcamentoAction, renameOrcamentoAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Orcamento } from "@/lib/types";

function hrefFor(basePath: string, extraQuery: Record<string, string | undefined>, orcamentoId: string) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(extraQuery)) {
    if (v) params.set(k, v);
  }
  params.set("orcamento", orcamentoId);
  return `${basePath}?${params.toString()}`;
}

function NovoOrcamentoDialog({
  obraId,
  orcamentos,
  proximoNumero,
  basePath,
  extraQuery,
}: {
  obraId: string;
  orcamentos: Orcamento[];
  proximoNumero: number;
  basePath: string;
  extraQuery: Record<string, string | undefined>;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const action = createOrcamentoAction.bind(null, obraId);
  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.id) {
      setOpen(false);
      router.push(hrefFor(basePath, extraQuery, state.id), { scroll: false });
    }
  }, [state, router, basePath, extraQuery]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="ghost" size="icon-sm" />}>
        <Plus className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova planilha de orçamento</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nome-novo-orcamento">Nome</Label>
            <Input
              id="nome-novo-orcamento"
              name="nome"
              required
              defaultValue={`Orçamento ${proximoNumero}`}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="copiar-de">Começar a partir de</Label>
            <Select
              name="copiarDe"
              defaultValue="nenhum"
              items={{
                nenhum: "Planilha em branco",
                ...Object.fromEntries(orcamentos.map((o) => [o.id, `Copiar de "${o.nome}"`])),
              }}
            >
              <SelectTrigger id="copiar-de" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhum">Planilha em branco</SelectItem>
                {orcamentos.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {`Copiar de "${o.nome}"`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Copiar traz todos os itens e a precificação da planilha escolhida, pra você ajustar só o que muda.
            </p>
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? "Criando..." : "Criar planilha"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RenomearOrcamentoDialog({ obraId, orcamento }: { obraId: string; orcamento: Orcamento }) {
  const [open, setOpen] = useState(false);
  const action = renameOrcamentoAction.bind(null, obraId, orcamento.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    if (state && !state.error) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<button type="button" className="opacity-0 group-hover:opacity-100" />}>
        <Pencil className="size-3" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renomear planilha</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`nome-${orcamento.id}`}>Nome</Label>
            <Input id={`nome-${orcamento.id}`} name="nome" required defaultValue={orcamento.nome} autoFocus />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function OrcamentoTabs({
  obraId,
  orcamentos,
  ativoId,
  basePath,
  extraQuery = {},
}: {
  obraId: string;
  orcamentos: Orcamento[];
  ativoId: string;
  basePath: string;
  extraQuery?: Record<string, string | undefined>;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function excluir(orcamento: Orcamento) {
    startTransition(async () => {
      const res = await deleteOrcamentoAction(obraId, orcamento.id);
      if (res.error) return;
      if (orcamento.id === ativoId) {
        const outro = orcamentos.find((o) => o.id !== orcamento.id);
        if (outro) router.push(hrefFor(basePath, extraQuery, outro.id), { scroll: false });
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b pb-2">
      {orcamentos.map((o) => {
        const ativo = o.id === ativoId;
        return (
          <div
            key={o.id}
            className={cn(
              "group flex items-center gap-1.5 rounded-t-md px-3 py-1.5 text-sm",
              ativo ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/50"
            )}
          >
            <Link href={hrefFor(basePath, extraQuery, o.id)} scroll={false}>
              {o.nome}
            </Link>
            {ativo && (
              <>
                <RenomearOrcamentoDialog obraId={obraId} orcamento={o} />
                {orcamentos.length > 1 && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => excluir(o)}
                    className="text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}
      <NovoOrcamentoDialog
        obraId={obraId}
        orcamentos={orcamentos}
        proximoNumero={orcamentos.length + 1}
        basePath={basePath}
        extraQuery={extraQuery}
      />
    </div>
  );
}
