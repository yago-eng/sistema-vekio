import { Download, ExternalLink, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Arquivo } from "@/lib/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

// Mostra o cronograma enviado em Documentos (feito fora do sistema): o mais
// recente aparece na tela; os anteriores ficam como versões antigas.
export function CronogramaArquivo({ arquivos }: { arquivos: Arquivo[] }) {
  const ordenados = [...arquivos].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const atual = ordenados[0];
  if (!atual) return null;
  const anteriores = ordenados.slice(1);
  const src = `/api/files/${atual.id}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{atual.nomeOriginal}</p>
          <p className="text-xs text-muted-foreground">Enviado em {formatDate(atual.createdAt)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" nativeButton={false} render={<a href={`/arquivo/${atual.id}`} />}>
            <ExternalLink className="size-4" />
            Tela cheia
          </Button>
          <Button variant="outline" size="sm" className="gap-2" nativeButton={false} render={<a href={src} download />}>
            <Download className="size-4" />
            Baixar
          </Button>
        </div>
      </div>

      {atual.mimeType === "application/pdf" ? (
        <iframe
          src={src}
          title={atual.nomeOriginal}
          className="h-[70vh] min-h-[420px] w-full rounded-lg border bg-muted/30"
        />
      ) : atual.mimeType.startsWith("image/") ? (
        <a href={`/arquivo/${atual.id}`} className="block overflow-hidden rounded-lg border bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={atual.nomeOriginal} className="mx-auto h-auto w-full max-w-full object-contain" />
        </a>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-lg border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
          <FileSpreadsheet className="size-8" />
          <p>Este tipo de arquivo não abre aqui. Use o botão Baixar para ver o cronograma.</p>
        </div>
      )}

      {anteriores.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground">Versões anteriores</p>
          {anteriores.map((a) => (
            <a
              key={a.id}
              href={`/arquivo/${a.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border px-3 py-1.5 text-xs hover:bg-muted/40"
            >
              <span className="truncate">{a.nomeOriginal}</span>
              <span className="shrink-0 text-muted-foreground">{formatDate(a.createdAt)}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
