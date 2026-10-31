"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adicionarChecklistAction,
  carregarTarefaAction,
  comentarTarefaAction,
  criarUploadTarefaAction,
  excluirAnexoTarefaAction,
  excluirChecklistAction,
  excluirComentarioAction,
  excluirTarefaAction,
  marcarChecklistAction,
  mudarStatusTarefaAction,
  registrarAnexoTarefaAction,
} from "@/lib/tarefa-actions";
import { enviarArquivoDireto } from "@/lib/upload-client";
import { comprimirImagemSeNecessario } from "@/lib/image-compress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TarefaForm, type ObraOpcao } from "@/components/tarefa-form";
import { Download, Loader2, Paperclip, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import {
  TAREFA_PRIORIDADES,
  TAREFA_RECORRENCIAS,
  TAREFA_STATUS,
  type MembroEquipe,
  type TarefaDetalhe,
} from "@/lib/types";

export const COR_PRIORIDADE: Record<string, string> = {
  urgente: "bg-red-100 text-red-700",
  alta: "bg-orange-100 text-orange-700",
  normal: "bg-slate-100 text-slate-700",
  baixa: "bg-sky-100 text-sky-700",
};

export function formatarPrazo(prazo: string) {
  return prazo.split("-").reverse().slice(0, 2).join("/");
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function quando(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TarefaDetalheDialog({
  id,
  onFechar,
  membros,
  obras,
  obraFixaId,
  usuarioId,
  isAdmin,
}: {
  id: string | null;
  onFechar: () => void;
  membros: MembroEquipe[];
  obras: ObraOpcao[];
  obraFixaId?: string;
  usuarioId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [detalhe, setDetalhe] = useState<TarefaDetalhe | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [novoItem, setNovoItem] = useState("");
  const [novoComentario, setNovoComentario] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [pending, startTransition] = useTransition();
  const arquivoRef = useRef<HTMLInputElement>(null);

  const recarregar = useCallback(async () => {
    if (!id) return;
    const d = await carregarTarefaAction(id);
    setDetalhe(d);
    router.refresh();
  }, [id, router]);

  useEffect(() => {
    setDetalhe(null);
    setEditando(false);
    setErro(null);
    setNovoItem("");
    setNovoComentario("");
    if (!id) return;
    let ativo = true;
    setCarregando(true);
    carregarTarefaAction(id)
      .then((d) => ativo && setDetalhe(d))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [id]);

  function rodar(fn: () => Promise<{ error?: string } | void>) {
    setErro(null);
    startTransition(async () => {
      const res = await fn();
      if (res && res.error) setErro(res.error);
      await recarregar();
    });
  }

  async function anexar(files: FileList | null) {
    if (!id || !files || files.length === 0) return;
    setEnviando(true);
    setErro(null);
    try {
      for (const original of Array.from(files)) {
        if (original.size === 0) throw new Error(`"${original.name}" chegou vazio (0 bytes).`);
        const file = await comprimirImagemSeNecessario(original);
        const assinado = await criarUploadTarefaAction(id, file.name);
        if (!assinado.ok) throw new Error(assinado.error);
        await enviarArquivoDireto(assinado.path, assinado.token, file);
        const reg = await registrarAnexoTarefaAction({
          tarefaId: id,
          caminhoArmazenado: assinado.path,
          nomeOriginal: file.name,
          tamanhoBytes: file.size,
          mimeType: file.type || "application/octet-stream",
        });
        if (reg.error) throw new Error(reg.error);
      }
      await recarregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao anexar o arquivo.");
    } finally {
      setEnviando(false);
      if (arquivoRef.current) arquivoRef.current.value = "";
    }
  }

  const t = detalhe?.tarefa;
  const feitos = detalhe?.checklist.filter((c) => c.feito).length ?? 0;
  const total = detalhe?.checklist.length ?? 0;
  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const atrasada = !!t && t.status !== "concluida" && !!t.prazo && t.prazo < hoje;

  return (
    <Dialog open={!!id} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar tarefa" : (t?.titulo ?? "Tarefa")}</DialogTitle>
        </DialogHeader>

        {carregando && !detalhe && (
          <div className="flex justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!carregando && !detalhe && (
          <p className="py-6 text-center text-sm text-muted-foreground">Tarefa não encontrada.</p>
        )}

        {detalhe && t && editando && (
          <TarefaForm
            tarefa={t}
            membros={membros}
            obras={obras}
            obraFixaId={obraFixaId}
            usuarioId={usuarioId}
            onCancelar={() => setEditando(false)}
            onSalvo={async () => {
              setEditando(false);
              await recarregar();
            }}
          />
        )}

        {detalhe && t && !editando && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={t.status}
                onValueChange={(v) => rodar(() => mudarStatusTarefaAction(t.id, String(v)))}
                items={Object.fromEntries(TAREFA_STATUS.map((s) => [s.id, s.label]))}
              >
                <SelectTrigger size="sm" className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAREFA_STATUS.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="secondary" className={COR_PRIORIDADE[t.prioridade]}>
                {TAREFA_PRIORIDADES.find((p) => p.id === t.prioridade)?.label}
              </Badge>
              {t.recorrencia !== "nenhuma" && (
                <Badge variant="outline" className="gap-1">
                  <Repeat className="size-3" />
                  {TAREFA_RECORRENCIAS.find((r) => r.id === t.recorrencia)?.label}
                </Badge>
              )}
              <div className="ml-auto flex gap-1">
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setEditando(true)}>
                  <Pencil className="size-3.5" />
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Excluir tarefa"
                  className="text-destructive hover:text-destructive"
                  onClick={async () => {
                    if (!window.confirm(`Excluir a tarefa "${t.titulo}"? Isso não pode ser desfeito.`)) return;
                    await excluirTarefaAction(t.id);
                    onFechar();
                    router.refresh();
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Responsável</dt>
                <dd>{t.responsavelNome ?? "Sem responsável"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Prazo</dt>
                <dd className={atrasada ? "font-medium text-destructive" : undefined}>
                  {t.prazo ? t.prazo.split("-").reverse().join("/") : "Sem prazo"}
                  {atrasada && " · atrasada"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Obra</dt>
                <dd>{t.obraNome ?? "Geral"}</dd>
              </div>
            </dl>

            {t.descricao && <p className="whitespace-pre-wrap text-sm">{t.descricao}</p>}

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">
                Checklist{total > 0 && <span className="ml-2 font-normal text-muted-foreground">{feitos}/{total}</span>}
              </h3>
              {detalhe.checklist.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={c.feito}
                    onCheckedChange={(v) => rodar(() => marcarChecklistAction(c.id, !!v))}
                  />
                  <span className={c.feito ? "flex-1 text-sm text-muted-foreground line-through" : "flex-1 text-sm"}>
                    {c.texto}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remover item"
                    onClick={() => rodar(() => excluirChecklistAction(c.id))}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const texto = novoItem;
                  if (!texto.trim()) return;
                  setNovoItem("");
                  rodar(() => adicionarChecklistAction(t.id, texto));
                }}
              >
                <Input value={novoItem} onChange={(e) => setNovoItem(e.target.value)} placeholder="Novo item do checklist" />
                <Button type="submit" variant="outline" size="icon" aria-label="Adicionar item" disabled={!novoItem.trim()}>
                  <Plus className="size-4" />
                </Button>
              </form>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">Anexos</h3>
              {detalhe.anexos.map((a) => (
                <div key={a.id} className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm">
                  <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                  <a
                    href={`/api/tarefa-anexos/${a.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 truncate hover:underline"
                  >
                    {a.nomeOriginal}
                  </a>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatSize(a.tamanhoBytes)}</span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    nativeButton={false}
                    aria-label="Baixar"
                    render={<a href={`/api/tarefa-anexos/${a.id}`} download={a.nomeOriginal} />}
                  >
                    <Download className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remover anexo"
                    onClick={() => {
                      if (window.confirm(`Remover o anexo "${a.nomeOriginal}"?`)) rodar(() => excluirAnexoTarefaAction(a.id));
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
              <input
                ref={arquivoRef}
                type="file"
                multiple
                disabled={enviando}
                onChange={(e) => anexar(e.target.files)}
                className="rounded-lg border border-input bg-transparent text-sm file:mr-3 file:h-8 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:text-sm file:font-medium file:text-secondary-foreground"
              />
              {enviando && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Enviando anexo...
                </p>
              )}
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">Comentários</h3>
              {detalhe.comentarios.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum comentário ainda.</p>
              )}
              {detalhe.comentarios.map((c) => (
                <div key={c.id} className="flex flex-col gap-0.5 rounded-lg bg-muted/50 px-3 py-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{c.autorNome}</span>
                    <span>{quando(c.createdAt)}</span>
                    {(c.autorId === usuarioId || isAdmin) && (
                      <button
                        type="button"
                        className="ml-auto hover:text-destructive"
                        aria-label="Apagar comentário"
                        onClick={() => rodar(() => excluirComentarioAction(c.id))}
                      >
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{c.texto}</p>
                </div>
              ))}
              <form
                className="flex flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const texto = novoComentario;
                  if (!texto.trim()) return;
                  setNovoComentario("");
                  rodar(() => comentarTarefaAction(t.id, texto));
                }}
              >
                <Textarea
                  value={novoComentario}
                  onChange={(e) => setNovoComentario(e.target.value)}
                  placeholder="Escreva um comentário..."
                />
                <Button type="submit" size="sm" className="self-end" disabled={pending || !novoComentario.trim()}>
                  Comentar
                </Button>
              </form>
            </section>

            {erro && <p className="text-sm text-destructive">{erro}</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
