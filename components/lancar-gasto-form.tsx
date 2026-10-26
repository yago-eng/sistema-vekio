"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createLancamentoAvulsoAction,
  criarUploadAssinadoAction,
  lerNotaFiscalArmazenadaAction,
} from "@/lib/actions";
import { enviarArquivoDireto } from "@/lib/upload-client";
import { comprimirImagemSeNecessario } from "@/lib/image-compress";
import { Button } from "@/components/ui/button";
import { FornecedorInput } from "@/components/fornecedor-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, X } from "lucide-react";
import { SetorMaoDeObraField } from "@/components/setor-mao-de-obra-field";
import { CATEGORIA_MAO_DE_OBRA, type Categoria } from "@/lib/types";

type ObraOption = { id: string; nome: string; regiao: string };
type NotaInfo = { path: string; nome: string; tamanho: number; mime: string };

export function LancarGastoForm({
  obras,
  categorias,
}: {
  obras: ObraOption[];
  categorias: Categoria[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const valorRef = useRef<HTMLInputElement>(null);
  const dataRef = useRef<HTMLInputElement>(null);
  const descricaoRef = useRef<HTMLInputElement>(null);
  const fornecedorRef = useRef<HTMLInputElement>(null);
  const [busca, setBusca] = useState("");
  const [obraId, setObraId] = useState("");
  const [obraNome, setObraNome] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [aberto, setAberto] = useState(false);
  const [lendoNota, setLendoNota] = useState(false);
  const [notaMsg, setNotaMsg] = useState<string | null>(null);
  const [notaInfo, setNotaInfo] = useState<NotaInfo | null>(null);

  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string; ok?: boolean } | undefined, formData: FormData) => {
      formData.set("obraId", obraId);
      if (notaInfo) {
        formData.set("notaPath", notaInfo.path);
        formData.set("notaNome", notaInfo.nome);
        formData.set("notaTamanho", String(notaInfo.tamanho));
        formData.set("notaMime", notaInfo.mime);
      }
      const result = await createLancamentoAvulsoAction(prev, formData);
      return result;
    },
    undefined
  );

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setBusca("");
      setObraId("");
      setObraNome("");
      setCategoriaId("");
      setNotaMsg(null);
      setNotaInfo(null);
    }
  }, [state]);

  async function handleNotaChange(e: React.ChangeEvent<HTMLInputElement>) {
    let file = e.target.files?.[0];
    setNotaInfo(null);
    if (!file) {
      setNotaMsg(null);
      return;
    }
    if (file.size === 0) {
      setNotaMsg("O arquivo chegou vazio (0 bytes) — tente tirar a foto ou selecionar o arquivo novamente.");
      return;
    }

    setLendoNota(true);
    setNotaMsg("Enviando arquivo...");
    try {
      // Fotos da galeria do iPhone costumam vir em HEIC, formato que a IA
      // não lê — converte pra JPEG (e aproveita pra reduzir o tamanho) antes
      // de enviar, senão a leitura automática falha silenciosamente.
      file = await comprimirImagemSeNecessario(file);
      const assinado = await criarUploadAssinadoAction(obraId || "avulso", file.name);
      if (!assinado.ok) {
        setNotaMsg(`Não consegui enviar o arquivo (${assinado.error}).`);
        return;
      }
      await enviarArquivoDireto(assinado.path, assinado.token, file);
      setNotaInfo({
        path: assinado.path,
        nome: file.name,
        tamanho: file.size,
        mime: file.type || "application/octet-stream",
      });

      if (!file.type.startsWith("image/")) {
        setNotaMsg("Arquivo enviado. Preencha os dados manualmente.");
        return;
      }

      setNotaMsg("Lendo a nota automaticamente...");
      const res = await lerNotaFiscalArmazenadaAction(assinado.path, file.type);
      if (!res.ok) {
        setNotaMsg(`Nota enviada, mas não consegui ler automaticamente (${res.error}). Preencha manualmente.`);
        return;
      }

      const preenchidos: string[] = [];
      if (res.data.valor && valorRef.current && !valorRef.current.value) {
        valorRef.current.value = String(res.data.valor);
        preenchidos.push("valor");
      }
      if (res.data.data && dataRef.current) {
        dataRef.current.value = res.data.data;
        preenchidos.push("data");
      }
      if (res.data.descricao && descricaoRef.current && !descricaoRef.current.value) {
        descricaoRef.current.value = res.data.descricao;
        preenchidos.push("descrição");
      }
      if (res.data.fornecedor && fornecedorRef.current && !fornecedorRef.current.value) {
        fornecedorRef.current.value = res.data.fornecedor;
        preenchidos.push("fornecedor");
      }
      if (res.data.categoriaNome && !categoriaId) {
        const match = categorias.find(
          (c) => c.nome.toLowerCase() === res.data.categoriaNome!.toLowerCase()
        );
        if (match) {
          setCategoriaId(match.id);
          preenchidos.push("categoria");
        }
      }
      setNotaMsg(
        preenchidos.length > 0
          ? `Lido da nota: ${preenchidos.join(", ")}. Confira antes de lançar.`
          : "Não consegui identificar os dados na nota. Preencha manualmente."
      );
    } catch {
      setNotaMsg("Não consegui enviar/ler a nota automaticamente. Preencha manualmente.");
    } finally {
      setLendoNota(false);
    }
  }

  const filtradas =
    busca.trim().length === 0
      ? obras
      : obras.filter((o) => o.nome.toLowerCase().includes(busca.toLowerCase()));

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      {/* Busca de obra por digitação */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="buscaObra">Obra</Label>
        {obraId ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
            <span className="font-medium">{obraNome}</span>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setObraId("");
                setObraNome("");
                setBusca("");
              }}
            >
              trocar
            </button>
          </div>
        ) : (
          <div className="relative">
            <Input
              id="buscaObra"
              autoComplete="off"
              placeholder="Digite o nome da obra..."
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setAberto(true);
              }}
              onFocus={() => setAberto(true)}
            />
            {aberto && busca.trim().length > 0 && (
              <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border bg-popover shadow-md">
                {filtradas.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">Nenhuma obra encontrada.</p>
                ) : (
                  filtradas.slice(0, 30).map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setObraId(o.id);
                        setObraNome(o.nome);
                        setAberto(false);
                      }}
                    >
                      <span className="font-medium">{o.nome}</span>
                      <span className="text-xs text-muted-foreground">{o.regiao}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="categoriaId">Categoria</Label>
        <Select
          name="categoriaId"
          required
          value={categoriaId}
          onValueChange={(value) => setCategoriaId(value as string)}
          items={Object.fromEntries(categorias.map((c) => [c.id, c.nome]))}
        >
          <SelectTrigger id="categoriaId" className="w-full">
            <SelectValue placeholder="Selecione a categoria" />
          </SelectTrigger>
          <SelectContent>
            {categorias.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {categorias.find((c) => c.id === categoriaId)?.nome === CATEGORIA_MAO_DE_OBRA && (
        <SetorMaoDeObraField id="setor" />
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="fornecedor">Fornecedor</Label>
        <FornecedorInput
          ref={fornecedorRef}
          id="fornecedor"
          name="fornecedor"
          placeholder="Ex: Casas d'Água"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="nota">Foto da nota (opcional)</Label>
        {notaInfo ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
            <span className="truncate">{notaInfo.nome}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => {
                setNotaInfo(null);
                setNotaMsg(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ) : (
          <input
            ref={fileInputRef}
            id="nota"
            type="file"
            accept="image/*,application/pdf"
            onChange={handleNotaChange}
            className="rounded-lg border border-input bg-transparent text-sm file:mr-3 file:h-8 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:text-sm file:font-medium file:text-secondary-foreground"
          />
        )}
        <p className="text-xs text-muted-foreground">
          Informe o valor ou anexe a foto da nota — pelo menos um dos dois. Pode enviar sem
          preencher mais nada; a IA lê a nota automaticamente.
        </p>
        {lendoNota && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 animate-pulse" />
            {notaMsg ?? "Processando..."}
          </p>
        )}
        {notaMsg && !lendoNota && <p className="text-xs text-muted-foreground">{notaMsg}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="valor">Valor (R$)</Label>
          <Input ref={valorRef} id="valor" name="valor" type="number" min="0" step="0.01" placeholder="0,00" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="data">Data</Label>
          <Input
            ref={dataRef}
            id="data"
            name="data"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Input
          ref={descricaoRef}
          id="descricao"
          name="descricao"
          placeholder="Ex: Compra de cimento (ou deixe em branco — a IA preenche pela nota)"
        />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-600">Gasto lançado na obra com sucesso!</p>}
      <Button type="submit" disabled={pending || !obraId || lendoNota} className="mt-2">
        {pending ? "Lançando..." : "Lançar gasto"}
      </Button>
    </form>
  );
}
