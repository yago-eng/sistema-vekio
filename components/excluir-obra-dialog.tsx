"use client";

import { useState, useTransition } from "react";
import { deleteObraAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";

type Contagens = {
  lancamentos: number;
  arquivos: number;
  etapas: number;
  pagamentos: number;
  relatorios: number;
  clientes: number;
};

export function ExcluirObraDialog({
  obraId,
  obraNome,
  contagens,
}: {
  obraId: string;
  obraNome: string;
  contagens: Contagens;
}) {
  const [open, setOpen] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const itens = [
    [contagens.lancamentos, "lançamento(s) de gasto"],
    [contagens.arquivos, "arquivo(s)"],
    [contagens.etapas, "etapa(s) do cronograma"],
    [contagens.pagamentos, "pagamento(s) recebido(s)"],
    [contagens.relatorios, "relatório(s) de obra"],
    [contagens.clientes, "acesso(s) de cliente"],
  ] as const;
  const comDados = itens.filter(([n]) => n > 0);
  const confere = confirmacao.trim().toLowerCase() === obraNome.trim().toLowerCase();

  function excluir() {
    setErro(null);
    startTransition(async () => {
      const res = await deleteObraAction(obraId);
      if (res?.error) setErro(res.error);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setConfirmacao("");
          setErro(null);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            aria-label="Excluir obra"
          />
        }
      >
        <Trash2 className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir obra / cliente</DialogTitle>
          <DialogDescription>
            Isso apaga <strong>{obraNome}</strong> de forma permanente e não dá pra desfazer.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 text-sm">
          {comDados.length > 0 ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="mb-1 font-medium text-destructive">Também serão apagados:</p>
              <ul className="list-disc pl-5">
                {comDados.map(([n, label]) => (
                  <li key={label}>
                    {n} {label}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-muted-foreground">Essa obra não tem nenhum lançamento, arquivo ou outro dado.</p>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmar-exclusao">Para confirmar, digite o nome da obra:</Label>
            <Input
              id="confirmar-exclusao"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              placeholder={obraNome}
              autoComplete="off"
            />
          </div>
          {erro && <p className="text-destructive">{erro}</p>}
          <Button variant="destructive" disabled={!confere || pending} onClick={excluir}>
            {pending ? "Excluindo..." : "Excluir definitivamente"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
