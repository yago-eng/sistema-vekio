"use client";

import { useState, useTransition } from "react";
import {
  deleteArquivoAction,
  organizarArquivosAction,
  toggleArquivoVisivelClienteAction,
} from "@/lib/actions";
import { Button } from "@/components/ui/button";
import {
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Film,
  ImageIcon,
  Loader2,
  Receipt,
  PencilRuler,
  PlayCircle,
  Sparkles,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { agruparPorMesESemana } from "@/lib/agrupar-arquivos";
import {
  ARQUIVO_CATEGORIAS,
  type Arquivo,
  type ArquivoCategoria,
} from "@/lib/types";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type AbaArquivos = "foto" | "video" | "documento" | "nota";

const ABAS: { id: AbaArquivos; label: string; icone: typeof ImageIcon }[] = [
  { id: "foto", label: "Fotos", icone: ImageIcon },
  { id: "video", label: "Vídeos", icone: PlayCircle },
  { id: "documento", label: "Documentos", icone: FileText },
  { id: "nota", label: "Notas fiscais", icone: Receipt },
];

function abaDe(a: Arquivo): AbaArquivos {
  if (a.categoria === "nota_fiscal") return "nota";
  if (a.mimeType.startsWith("image/")) return "foto";
  if (a.mimeType.startsWith("video/")) return "video";
  return "documento";
}

const ORDEM_SECOES: ArquivoCategoria[] = [
  "foto",
  "registro",
  "projeto",
  "contrato",
  "relatorio",
  "documento",
];

const TITULO_SECAO: Record<ArquivoCategoria, string> = {
  nota_fiscal: "Notas fiscais e cupons",
  foto: "Fotos e vídeos",
  registro: "Registros de obra",
  projeto: "Projetos e plantas",
  contrato: "Contratos",
  relatorio: "Relatórios",
  documento: "Documentos",
};

function extensao(nome: string) {
  const m = nome.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toUpperCase() : "ARQ";
}

// Ícone/cor do cartão quando o arquivo não tem miniatura de imagem.
function estiloTipo(a: Arquivo) {
  const ext = extensao(a.nomeOriginal);
  if (a.mimeType.startsWith("video/"))
    return {
      Icone: Film,
      cor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
    };
  if (a.mimeType === "application/pdf" || ext === "PDF")
    return {
      Icone: FileText,
      cor: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    };
  if (["XLS", "XLSX", "CSV"].includes(ext))
    return {
      Icone: FileSpreadsheet,
      cor: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
    };
  if (["DWG", "DXF", "RVT", "SKP", "IFC"].includes(ext))
    return {
      Icone: PencilRuler,
      cor: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    };
  if (["DOC", "DOCX"].includes(ext))
    return {
      Icone: FileText,
      cor: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    };
  return { Icone: FileText, cor: "bg-muted text-muted-foreground" };
}

function Miniatura({ arquivo }: { arquivo: Arquivo }) {
  const [falhou, setFalhou] = useState(false);
  const { Icone, cor } = estiloTipo(arquivo);

  if (arquivo.mimeType.startsWith("image/") && !falhou) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/files/${arquivo.id}/thumb`}
        alt={arquivo.legenda ?? arquivo.nomeOriginal}
        loading="lazy"
        onError={() => setFalhou(true)}
        className="size-full object-cover"
      />
    );
  }
  return (
    <div
      className={cn(
        "flex size-full flex-col items-center justify-center gap-1",
        cor,
      )}
    >
      <Icone className="size-9" />
      <span className="text-xs font-semibold">
        {extensao(arquivo.nomeOriginal)}
      </span>
    </div>
  );
}

export function ArquivoList({
  obraId,
  arquivos,
}: {
  obraId: string;
  arquivos: Arquivo[];
}) {
  const [isPending, startTransition] = useTransition();
  const [organizando, setOrganizando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [abaEscolhida, setAbaEscolhida] = useState<AbaArquivos | null>(null);

  async function organizar() {
    setOrganizando(true);
    setAviso(null);
    try {
      const { movidos, restantes } = await organizarArquivosAction(obraId);
      setAviso(
        `${movidos} ${movidos === 1 ? "arquivo reorganizado" : "arquivos reorganizados"}.` +
          (restantes > 0
            ? ` Ainda há ${restantes} PDF(s) para analisar — clique de novo.`
            : ""),
      );
    } catch {
      setAviso("Não foi possível reorganizar agora. Tente novamente.");
    } finally {
      setOrganizando(false);
    }
  }

  if (arquivos.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhum arquivo enviado ainda.
      </p>
    );
  }

  const contagem: Record<AbaArquivos, number> = {
    foto: 0,
    video: 0,
    documento: 0,
    nota: 0,
  };
  for (const a of arquivos) contagem[abaDe(a)]++;
  const abasComItens = ABAS.filter((a) => contagem[a.id] > 0);
  const aba =
    abaEscolhida && contagem[abaEscolhida] > 0
      ? abaEscolhida
      : (abasComItens[0]?.id ?? "foto");

  // Fotos e vídeos ficam numa grade só; documentos se dividem por categoria
  // (projetos, contratos, relatórios...).
  function renderGrade(itens: Arquivo[]) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {itens.map((arquivo) => (
          <div
            key={arquivo.id}
            className="flex flex-col overflow-hidden rounded-lg border"
          >
            <a
              href={`/arquivo/${arquivo.id}`}
              className="block aspect-square bg-muted"
            >
              <Miniatura arquivo={arquivo} />
            </a>
            <div className="flex flex-col gap-0.5 px-2 pt-1.5">
              <a
                href={`/arquivo/${arquivo.id}`}
                title={arquivo.nomeOriginal}
                className="truncate text-xs font-medium hover:underline"
              >
                {arquivo.nomeOriginal}
              </a>
              <span className="truncate text-[11px] text-muted-foreground">
                {formatSize(arquivo.tamanhoBytes)}
                {arquivo.legenda ? ` · ${arquivo.legenda}` : ""}
              </span>
            </div>
            <div className="flex items-center justify-end gap-0.5 px-1 pb-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={isPending}
                title={
                  arquivo.visivelCliente
                    ? "Visível para o cliente — clique para ocultar"
                    : "Oculto do cliente — clique para compartilhar"
                }
                className={cn(
                  arquivo.visivelCliente
                    ? "text-primary"
                    : "text-muted-foreground/50 hover:text-foreground",
                )}
                onClick={() =>
                  startTransition(() =>
                    toggleArquivoVisivelClienteAction(
                      obraId,
                      arquivo.id,
                      !arquivo.visivelCliente,
                    ),
                  )
                }
              >
                {arquivo.visivelCliente ? (
                  <Eye className="size-3.5" />
                ) : (
                  <EyeOff className="size-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                nativeButton={false}
                render={<a href={`/api/files/${arquivo.id}`} download />}
              >
                <Download className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={isPending}
                className="text-muted-foreground hover:text-destructive"
                onClick={() =>
                  startTransition(() => deleteArquivoAction(obraId, arquivo.id))
                }
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const daAba = arquivos.filter((a) => abaDe(a) === aba);
  const secoes =
    aba === "documento"
      ? ORDEM_SECOES.map((cat) => ({
          cat,
          itens: daAba.filter((a) => a.categoria === cat),
        })).filter((s) => s.itens.length > 0)
      : [{ cat: null, itens: daAba }];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Eye className="size-3" />O olho define o que o cliente vê na Área do
          Cliente.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={organizando}
          onClick={organizar}
        >
          {organizando ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          {organizando ? "Analisando..." : "Organizar com IA"}
        </Button>
      </div>
      {aviso && <p className="text-xs text-muted-foreground">{aviso}</p>}

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {abasComItens.map(({ id, label, icone: Icone }) => (
          <button
            key={id}
            type="button"
            onClick={() => setAbaEscolhida(id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              aba === id
                ? "border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icone className="size-4" />
            {label}
            <span
              className={cn(
                "text-xs",
                aba === id ? "opacity-80" : "opacity-60",
              )}
            >
              {contagem[id]}
            </span>
          </button>
        ))}
      </div>

      {aba !== "documento" &&
        agruparPorMesESemana(daAba).map((mes) => (
          <section key={mes.chave} className="flex flex-col gap-4">
            <h3 className="text-sm font-bold">{mes.label}</h3>
            {mes.semanas.map((semana) => (
              <div key={semana.chave} className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {semana.label} · {semana.itens.length}
                </p>
                {renderGrade(semana.itens)}
              </div>
            ))}
          </section>
        ))}

      {aba === "documento" &&
        secoes.map(({ cat, itens }) => (
          <section key={cat ?? aba} className="flex flex-col gap-2">
            {cat && (
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                {TITULO_SECAO[cat] ??
                  ARQUIVO_CATEGORIAS.find((c) => c.id === cat)?.label}
                <span className="rounded-full bg-muted px-2 text-xs font-normal text-muted-foreground">
                  {itens.length}
                </span>
              </h3>
            )}
            {renderGrade(itens)}
          </section>
        ))}
    </div>
  );
}
