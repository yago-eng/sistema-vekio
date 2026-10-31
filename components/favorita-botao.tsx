"use client";

import { useState, useTransition } from "react";
import { alternarObraFavoritaAction } from "@/lib/favoritas-actions";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

export function FavoritaBotao({
  obraId,
  favorita,
  className,
}: {
  obraId: string;
  favorita: boolean;
  className?: string;
}) {
  const [ativa, setAtiva] = useState(favorita);
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-pressed={ativa}
      aria-label={ativa ? "Remover das favoritas" : "Adicionar às favoritas"}
      title={ativa ? "Remover das favoritas" : "Adicionar às favoritas"}
      className={cn(
        "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-amber-500",
        ativa && "text-amber-500",
        className
      )}
      onClick={() => {
        const novo = !ativa;
        setAtiva(novo);
        startTransition(async () => {
          const res = await alternarObraFavoritaAction(obraId, novo);
          if (res.error) setAtiva(!novo);
        });
      }}
    >
      <Star className={cn("size-4", ativa && "fill-current")} />
    </button>
  );
}
