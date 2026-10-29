"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { criarUploadAssinadoAction, registrarArquivoAction } from "@/lib/actions";
import { enviarArquivoDireto } from "@/lib/upload-client";
import { comprimirImagemSeNecessario } from "@/lib/image-compress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Loader2 } from "lucide-react";
import { ARQUIVO_CATEGORIAS } from "@/lib/types";

// Nenhuma etapa do envio pode ficar "carregando" pra sempre.
function comLimite<T>(promessa: Promise<T>, ms = 60_000): Promise<T> {
  return Promise.race([
    promessa,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("O servidor demorou a responder. Tente enviar novamente.")), ms)
    ),
  ]);
}

export function ArquivoUploadForm({ obraId }: { obraId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [categoria, setCategoria] = useState("auto");
  const [legenda, setLegenda] = useState("");
  const [visivelCliente, setVisivelCliente] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = formRef.current?.querySelector<HTMLInputElement>('input[name="arquivo"]');
    const files = Array.from(input?.files ?? []);
    if (files.length === 0) {
      setError("Selecione ao menos um arquivo.");
      return;
    }

    setEnviando(true);
    setError(null);
    try {
      for (let i = 0; i < files.length; i++) {
        let file = files[i];
        setProgresso(files.length > 1 ? `Enviando ${i + 1}/${files.length}: ${file.name}` : `Enviando ${file.name}...`);

        if (file.size === 0) {
          throw new Error(
            `"${file.name}" chegou vazio (0 bytes) — tente selecionar ou tirar a foto novamente.`
          );
        }

        // Fotos da galeria (principalmente iPhone) podem vir muito grandes
        // (HEIC de alta resolução) e travar o envio em conexão fraca de
        // obra sem nenhum erro visível — reduz antes de enviar.
        file = await comprimirImagemSeNecessario(file);

        const assinado = await comLimite(criarUploadAssinadoAction(obraId, file.name));
        if (!assinado.ok) throw new Error(assinado.error);

        await enviarArquivoDireto(assinado.path, assinado.token, file);

        const reg = await comLimite(registrarArquivoAction({
          obraId,
          caminhoArmazenado: assinado.path,
          nomeOriginal: file.name,
          tamanhoBytes: file.size,
          mimeType: file.type || "application/octet-stream",
          categoria,
          visivelCliente,
          legenda,
        }));
        if (reg.error) throw new Error(reg.error);
      }
      formRef.current?.reset();
      setVisivelCliente(false);
      setLegenda("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar arquivo.");
    } finally {
      setEnviando(false);
      setProgresso(null);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="arquivo">Arquivo(s)</Label>
        <input
          id="arquivo"
          name="arquivo"
          type="file"
          multiple
          required
          className="rounded-lg border border-input bg-transparent text-sm file:mr-3 file:h-8 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:text-sm file:font-medium file:text-secondary-foreground"
        />
        <p className="text-xs text-muted-foreground">
          Pode selecionar vários arquivos de uma vez. Na categoria automática, cada arquivo é classificado sozinho (foto, projeto, contrato, documento...). Sem limite
          de tamanho (o envio vai direto pro armazenamento).
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="categoria">Categoria</Label>
        <Select
          name="categoria"
          value={categoria}
          onValueChange={(v) => setCategoria(String(v))}
          items={{ auto: "Automática (IA)", ...Object.fromEntries(ARQUIVO_CATEGORIAS.map((c) => [c.id, c.label])) }}
        >
          <SelectTrigger id="categoria" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Automática (IA)</SelectItem>
            {ARQUIVO_CATEGORIAS.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="legenda">Legenda (opcional)</Label>
        <Input
          id="legenda"
          value={legenda}
          onChange={(e) => setLegenda(e.target.value)}
          placeholder="Ex: Fachada — semana 3"
        />
        <p className="text-xs text-muted-foreground">
          Aparece junto da foto pro cliente. Se enviar vários arquivos de uma vez, a mesma legenda vale
          pra todos.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="visivelCliente"
          checked={visivelCliente}
          onCheckedChange={(v) => setVisivelCliente(!!v)}
        />
        <Label htmlFor="visivelCliente" className="font-normal">
          Visível para o cliente na Área do Cliente
        </Label>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={enviando} className="gap-2">
        {enviando ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        {enviando ? progresso ?? "Enviando..." : "Enviar arquivo(s)"}
      </Button>
    </form>
  );
}
