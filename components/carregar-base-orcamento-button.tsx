"use client";

import { useTransition } from "react";
import { carregarBaseOrcamentoAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { ListPlus } from "lucide-react";

export function CarregarBaseOrcamentoButton({
  obraId,
  orcamentoId,
  temItens,
}: {
  obraId: string;
  orcamentoId: string;
  temItens: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (
      temItens &&
      !window.confirm(
        "Já existem itens de orçamento nessa obra. Carregar a base padrão vai SUBSTITUIR todos os itens atuais pela base padrão (os itens existentes serão apagados). Continuar?"
      )
    ) {
      return;
    }
    startTransition(() => carregarBaseOrcamentoAction(obraId, orcamentoId));
  }

  return (
    <Button variant="outline" size="sm" className="gap-2" disabled={pending} onClick={handleClick}>
      <ListPlus className="size-4" />
      {pending ? "Carregando..." : "Carregar base padrão"}
    </Button>
  );
}
