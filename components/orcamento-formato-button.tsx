"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Bold, Type } from "lucide-react";
import { updateOrcamentoItemFormatoAction } from "@/lib/actions";
import { CORES_ORCAMENTO } from "@/lib/types";
import { cn } from "@/lib/utils";

// Formatação básica da descrição de um item da planilha: negrito e cor.
export function FormatoItemButton({
  obraId,
  itemId,
  negrito,
  cor,
}: {
  obraId: string;
  itemId: string;
  negrito: boolean;
  cor: string | null;
}) {
  const raiz = useRef<HTMLDivElement>(null);
  const [aberto, setAberto] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!aberto) return;
    function fora(e: MouseEvent | TouchEvent) {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    document.addEventListener("touchstart", fora);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("touchstart", fora);
    };
  }, [aberto]);

  function aplicar(novo: { negrito: boolean; cor: string | null }) {
    startTransition(() => updateOrcamentoItemFormatoAction(obraId, itemId, novo));
  }

  const formatado = negrito || !!cor;

  return (
    <div ref={raiz} className="relative shrink-0">
      <button
        type="button"
        title="Negrito e cor do texto"
        aria-label="Formatar texto"
        onClick={() => setAberto((v) => !v)}
        className={cn(
          "flex size-7 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted hover:text-foreground",
          formatado && "border-primary/50 text-foreground"
        )}
        style={cor ? { color: cor } : undefined}
      >
        <Type className="size-3.5" />
      </button>

      {aberto && (
        <div className="absolute top-full right-0 z-30 mt-1 flex w-48 flex-col gap-2 rounded-lg border bg-popover p-2 text-popover-foreground shadow-md">
          <button
            type="button"
            disabled={pending}
            onClick={() => aplicar({ negrito: !negrito, cor })}
            className={cn(
              "flex items-center gap-2 rounded-md border px-2 py-1 text-xs hover:bg-muted",
              negrito && "border-primary/60 bg-muted font-semibold"
            )}
          >
            <Bold className="size-3.5" />
            Negrito
          </button>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={pending}
              title="Cor padrão"
              aria-label="Cor padrão"
              onClick={() => aplicar({ negrito, cor: null })}
              className={cn(
                "flex size-5 items-center justify-center rounded-full border text-[10px] text-muted-foreground",
                !cor && "ring-2 ring-primary/60"
              )}
            >
              A
            </button>
            {CORES_ORCAMENTO.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={pending}
                title={c.label}
                aria-label={c.label}
                onClick={() => aplicar({ negrito, cor: c.id })}
                className={cn("size-5 rounded-full border", cor === c.id && "ring-2 ring-primary/60 ring-offset-1")}
                style={{ backgroundColor: c.id }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
