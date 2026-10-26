import { Film, FileText, Download } from "lucide-react";
import { agruparPorMesESemana } from "@/lib/agrupar-arquivos";
import type { Arquivo } from "@/lib/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function isFotoOuVideo(a: Arquivo) {
  return a.mimeType.startsWith("image/") || a.mimeType.startsWith("video/");
}

function AgrupadoPorMesESemana({
  itens,
  children,
}: {
  itens: Arquivo[];
  children: (itensDaSemana: Arquivo[]) => React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      {agruparPorMesESemana(itens).map((mes) => (
        <div key={mes.chave} className="flex flex-col gap-4">
          <h4 className="text-sm font-bold">{mes.label}</h4>
          {mes.semanas.map((semana) => (
            <div key={semana.chave} className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">{semana.label}</p>
              {children(semana.itens)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function GradeFotos({ itens }: { itens: Arquivo[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {itens.map((a) => (
        <a
          key={a.id}
          href={`/arquivo/${a.id}`}
          className="group flex flex-col gap-1"
        >
          <div className="aspect-square overflow-hidden rounded-lg border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/files/${a.id}`}
              alt={a.nomeOriginal}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          </div>
          {a.legenda && <p className="truncate text-xs font-medium">{a.legenda}</p>}
          <p className="truncate text-xs text-muted-foreground">{formatDate(a.createdAt)}</p>
        </a>
      ))}
    </div>
  );
}

export function PortalFotosVideos({ arquivos }: { arquivos: Arquivo[] }) {
  const fotos = arquivos.filter((a) => a.mimeType.startsWith("image/"));
  const videos = arquivos.filter((a) => a.mimeType.startsWith("video/"));
  const outrosRegistros = arquivos.filter((a) => !isFotoOuVideo(a));

  if (fotos.length === 0 && videos.length === 0 && outrosRegistros.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhuma foto ou registro de obra compartilhado ainda.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {fotos.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Fotos</h3>
          <AgrupadoPorMesESemana itens={fotos}>
            {(itensDaSemana) => <GradeFotos itens={itensDaSemana} />}
          </AgrupadoPorMesESemana>
        </div>
      )}

      {videos.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Vídeos</h3>
          <AgrupadoPorMesESemana itens={videos}>
            {(itensDaSemana) => (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {itensDaSemana.map((a) => (
                  <div key={a.id} className="flex flex-col gap-1">
                    <video controls className="w-full rounded-lg border bg-black">
                      <source src={`/api/files/${a.id}`} type={a.mimeType} />
                    </video>
                    {a.legenda && <p className="text-xs font-medium">{a.legenda}</p>}
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Film className="size-3" />
                      {a.nomeOriginal} · {formatDate(a.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </AgrupadoPorMesESemana>
        </div>
      )}

      {outrosRegistros.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Registros de obra</h3>
          <AgrupadoPorMesESemana itens={outrosRegistros}>
            {(itensDaSemana) => (
              <div className="flex flex-col gap-2">
                {itensDaSemana.map((a) => (
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
          </AgrupadoPorMesESemana>
        </div>
      )}
    </div>
  );
}
