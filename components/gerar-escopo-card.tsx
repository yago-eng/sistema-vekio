"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { gerarEscopoOrcamentoAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Loader2, FileText } from "lucide-react";

export function GerarEscopoCard({
  obraId,
  orcamentoId,
  temEscopo,
}: {
  obraId: string;
  orcamentoId: string;
  temEscopo: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const router = useRouter();
  const escopoHref = `/obras/${obraId}/escopo?orcamento=${orcamentoId}`;

  function gerar() {
    setError(null);
    setAviso(null);
    startTransition(async () => {
      const res = await gerarEscopoOrcamentoAction(obraId, orcamentoId);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.aviso) setAviso(res.aviso);
      router.refresh();
      window.open(escopoHref, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="size-4 shrink-0" />
          {temEscopo
            ? "Escopo de serviços já gerado para esta proposta."
            : "Gere automaticamente o escopo de serviços formal para apresentar ao cliente, com base nos itens do orçamento e nos projetos anexados."}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {temEscopo && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              nativeButton={false}
              render={<a href={escopoHref} target="_blank" rel="noopener noreferrer" />}
            >
              Ver escopo
            </Button>
          )}
          <Button size="sm" disabled={pending} onClick={gerar} className="gap-2">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {pending ? "Gerando..." : temEscopo ? "Gerar novamente" : "Gerar escopo com IA"}
          </Button>
        </div>
        {error && <p className="w-full text-sm text-destructive">{error}</p>}
        {aviso && <p className="w-full text-sm text-amber-600">{aviso}</p>}
      </CardContent>
    </Card>
  );
}
