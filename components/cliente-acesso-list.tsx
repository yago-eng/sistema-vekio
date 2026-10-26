"use client";

import { useTransition } from "react";
import { removerClienteAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { EditarClienteDialog } from "@/components/editar-cliente-dialog";
import { AbasVisiveisDialog } from "@/components/abas-visiveis-dialog";
import { Trash2, Mail } from "lucide-react";
import type { ClienteAcesso } from "@/lib/store";

export function ClienteAcessoList({ obraId, clientes }: { obraId: string; clientes: ClienteAcesso[] }) {
  const [pending, startTransition] = useTransition();

  if (clientes.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nenhum cliente com acesso a esta obra ainda.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {clientes.map((c) => (
        <div key={c.clienteId} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{c.nome}</span>
            <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <Mail className="size-3" />
              {c.email}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <AbasVisiveisDialog clienteId={c.clienteId} obraId={obraId} abasAtuais={c.abasVisiveis} />
            <EditarClienteDialog clienteId={c.clienteId} obraId={obraId} nome={c.nome} email={c.email} />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={pending}
              className="text-muted-foreground hover:text-destructive"
              onClick={() => startTransition(() => removerClienteAction(obraId, c.clienteId))}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
