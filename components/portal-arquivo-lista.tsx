import { FileText, Download } from "lucide-react";
import { AgrupadoPorMesSemanaDia } from "@/components/portal-agrupado";
import type { Arquivo } from "@/lib/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function PortalArquivoLista({
  arquivos,
  vazio,
}: {
  arquivos: Arquivo[];
  vazio: string;
}) {
  if (arquivos.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{vazio}</p>;
  }

  return (
    <AgrupadoPorMesSemanaDia itens={arquivos}>
      {(itensDoDia) => (
        <div className="flex flex-col gap-2">
          {itensDoDia.map((a) => (
            <a
              key={a.id}
              href={`/arquivo/${a.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm hover:bg-muted/40"
            >
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{a.nomeOriginal}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                {formatDate(a.createdAt)}
                <Download className="size-3.5" />
              </span>
            </a>
          ))}
        </div>
      )}
    </AgrupadoPorMesSemanaDia>
  );
}
