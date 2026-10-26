"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ArquivoViewer({ id, nome, mimeType }: { id: string; nome: string; mimeType: string }) {
  const router = useRouter();
  const src = `/api/files/${id}`;

  function voltar() {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex items-center gap-2 border-b px-3 py-2">
        <Button type="button" variant="ghost" size="sm" className="shrink-0 gap-1" onClick={voltar}>
          <ArrowLeft className="size-4" />
          Voltar
        </Button>
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{nome}</p>
        <Button
          variant="outline"
          size="icon-sm"
          nativeButton={false}
          render={<a href={src} target="_blank" rel="noopener noreferrer" aria-label="Abrir em tela cheia" />}
        >
          <ExternalLink className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          nativeButton={false}
          render={<a href={src} download aria-label="Baixar" />}
        >
          <Download className="size-4" />
        </Button>
      </header>

      <main className="min-h-0 flex-1 overflow-auto bg-muted/30">
        {mimeType.startsWith("image/") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={nome} className="mx-auto h-auto max-h-full w-auto max-w-full object-contain" />
        ) : mimeType.startsWith("video/") ? (
          <video controls className="mx-auto max-h-full w-full bg-black">
            <source src={src} type={mimeType} />
          </video>
        ) : mimeType === "application/pdf" ? (
          <iframe src={src} title={nome} className="h-full w-full border-0" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
            <p>Esse tipo de arquivo não pode ser visualizado aqui.</p>
            <Button nativeButton={false} render={<a href={src} download />}>
              <Download className="size-4" />
              Baixar arquivo
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
