"use client";

import { useTransition } from "react";
import Link from "next/link";
import { removerClienteAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AbasVisiveisDialog } from "@/components/abas-visiveis-dialog";
import { EditarClienteDialog } from "@/components/editar-cliente-dialog";
import { Mail, Trash2, Building2 } from "lucide-react";
import type { ClienteAcessoGlobal } from "@/lib/store";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function ClientesGlobaisList({ clientes }: { clientes: ClienteAcessoGlobal[] }) {
  const [pending, startTransition] = useTransition();

  if (clientes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhum cliente com acesso ao portal ainda. Convide um cliente pela aba &quot;Cliente&quot;
          dentro da obra desejada.
        </CardContent>
      </Card>
    );
  }

  const porCliente = new Map<string, { nome: string; email: string; obras: ClienteAcessoGlobal[] }>();
  for (const c of clientes) {
    if (!porCliente.has(c.clienteId)) {
      porCliente.set(c.clienteId, { nome: c.nome, email: c.email, obras: [] });
    }
    porCliente.get(c.clienteId)!.obras.push(c);
  }

  return (
    <div className="flex flex-col gap-4">
      {Array.from(porCliente.entries()).map(([clienteId, info]) => (
        <Card key={clienteId}>
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">{info.nome}</CardTitle>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="size-3" />
                {info.email}
              </p>
            </div>
            <EditarClienteDialog clienteId={clienteId} nome={info.nome} email={info.email} />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {info.obras.map((o) => (
              <div
                key={o.obraId}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
              >
                <Link
                  href={`/obras/${o.obraId}`}
                  className="flex min-w-0 flex-1 items-center gap-2 text-sm hover:underline"
                >
                  <Building2 className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{o.obraNome}</span>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {o.regiao}
                  </Badge>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">Desde {formatDate(o.createdAt)}</span>
                  <AbasVisiveisDialog
                    clienteId={clienteId}
                    obraId={o.obraId}
                    abasAtuais={o.abasVisiveis}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={pending}
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => startTransition(() => removerClienteAction(o.obraId, clienteId))}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
