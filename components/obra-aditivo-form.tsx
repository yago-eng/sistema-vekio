"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createObraAditivoAction, criarUploadAssinadoAction } from "@/lib/actions";
import { enviarArquivoDireto } from "@/lib/upload-client";
import { comprimirImagemSeNecessario } from "@/lib/image-compress";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, X } from "lucide-react";

type Anexo = { path: string; nome: string; tamanho: number; mime: string };
type Parcela = { valor: string; data: string };

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Soma `meses` meses a uma data ISO (YYYY-MM-DD), mantendo o dia — ou o
// último dia do mês quando o mês de destino é mais curto (31/01 + 1 = 28/02).
function somarMeses(iso: string, meses: number) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const alvo = new Date(ano, mes - 1 + meses, 1);
  const ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  const d = new Date(alvo.getFullYear(), alvo.getMonth(), Math.min(dia, ultimoDia));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ObraAditivoForm({ obraId }: { obraId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hoje = new Date().toISOString().slice(0, 10);

  const [valor, setValor] = useState("");
  const [anexo, setAnexo] = useState<Anexo | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [anexoMsg, setAnexoMsg] = useState<string | null>(null);
  const [comParcelas, setComParcelas] = useState(false);
  const [qtdParcelas, setQtdParcelas] = useState("2");
  const [primeiraData, setPrimeiraData] = useState(hoje);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);

  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string } | undefined, formData: FormData) => {
      if (anexo) {
        formData.set("anexoPath", anexo.path);
        formData.set("anexoNome", anexo.nome);
        formData.set("anexoTamanho", String(anexo.tamanho));
        formData.set("anexoMime", anexo.mime);
      }
      if (comParcelas && parcelas.length === 0) {
        return {
          error: "Clique em \"Dividir em parcelas iguais\" para gerar as parcelas, ou desmarque a opção de parcelas.",
        };
      }
      if (comParcelas && parcelas.length > 0) {
        formData.set(
          "parcelas",
          JSON.stringify(parcelas.map((p) => ({ valor: Number(p.valor), data: p.data })))
        );
      }
      return createObraAditivoAction(obraId, prev, formData);
    },
    undefined
  );

  useEffect(() => {
    if (state && !state.error) {
      formRef.current?.reset();
      setValor("");
      setAnexo(null);
      setAnexoMsg(null);
      setComParcelas(false);
      setParcelas([]);
    }
  }, [state]);

  async function handleAnexo(e: React.ChangeEvent<HTMLInputElement>) {
    let file = e.target.files?.[0];
    setAnexo(null);
    if (!file) return;
    if (file.size === 0) {
      setAnexoMsg("O arquivo chegou vazio (0 bytes) — selecione novamente.");
      return;
    }
    setEnviando(true);
    setAnexoMsg("Enviando arquivo...");
    try {
      file = await comprimirImagemSeNecessario(file);
      const assinado = await criarUploadAssinadoAction(obraId, file.name);
      if (!assinado.ok) throw new Error(assinado.error);
      await enviarArquivoDireto(assinado.path, assinado.token, file);
      setAnexo({
        path: assinado.path,
        nome: file.name,
        tamanho: file.size,
        mime: file.type || "application/octet-stream",
      });
      setAnexoMsg(null);
    } catch (err) {
      setAnexoMsg(err instanceof Error ? err.message : "Não consegui enviar o arquivo.");
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setEnviando(false);
    }
  }

  function gerarParcelas() {
    const total = Number(valor);
    const qtd = Math.max(1, Math.min(60, Math.floor(Number(qtdParcelas)) || 0));
    if (!(total > 0) || !qtd || !primeiraData) return;
    const centavos = Math.round(total * 100);
    const base = Math.floor(centavos / qtd);
    const resto = centavos - base * qtd;
    setParcelas(
      Array.from({ length: qtd }, (_, i) => ({
        // a última parcela absorve a diferença de arredondamento
        valor: ((i === qtd - 1 ? base + resto : base) / 100).toFixed(2),
        data: somarMeses(primeiraData, i),
      }))
    );
  }

  function atualizarParcela(i: number, campo: keyof Parcela, v: string) {
    setParcelas((ps) => ps.map((p, idx) => (idx === i ? { ...p, [campo]: v } : p)));
  }

  const somaParcelas = parcelas.reduce((s, p) => s + (Number(p.valor) || 0), 0);
  const diferenca = Number(valor) - somaParcelas;

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="descricaoAditivo">Descrição</Label>
        <Input
          id="descricaoAditivo"
          name="descricao"
          required
          placeholder="Ex: Passagem de cabo internet"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="valorAditivo">Valor (R$)</Label>
          <Input
            id="valorAditivo"
            name="valor"
            type="number"
            min="0"
            step="0.01"
            required
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dataAditivo">Data</Label>
          <Input id="dataAditivo" name="data" type="date" required defaultValue={hoje} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="anexoAditivo">Orçamento do aditivo (opcional)</Label>
        {anexo ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
            <span className="truncate">{anexo.nome}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => {
                setAnexo(null);
                setAnexoMsg(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ) : (
          <input
            ref={fileRef}
            id="anexoAditivo"
            type="file"
            accept="image/*,application/pdf,.xlsx,.xls"
            onChange={handleAnexo}
            disabled={enviando}
            className="rounded-lg border border-input bg-transparent text-sm file:mr-3 file:h-8 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:text-sm file:font-medium file:text-secondary-foreground"
          />
        )}
        {enviando && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            {anexoMsg ?? "Enviando..."}
          </p>
        )}
        {!enviando && anexoMsg && <p className="text-xs text-destructive">{anexoMsg}</p>}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border p-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="comParcelas"
            checked={comParcelas}
            onCheckedChange={(v) => setComParcelas(!!v)}
          />
          <Label htmlFor="comParcelas" className="font-normal">
            Adicionar parcelas de pagamento deste aditivo
          </Label>
        </div>

        {comParcelas && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="qtdParcelas">Nº de parcelas</Label>
                <Input
                  id="qtdParcelas"
                  type="number"
                  min="1"
                  max="60"
                  step="1"
                  value={qtdParcelas}
                  onChange={(e) => setQtdParcelas(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="primeiraData">1º vencimento</Label>
                <Input
                  id="primeiraData"
                  type="date"
                  value={primeiraData}
                  onChange={(e) => setPrimeiraData(e.target.value)}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={gerarParcelas}
              disabled={!(Number(valor) > 0)}
            >
              {parcelas.length > 0 ? "Refazer divisão igual (mensal)" : "Dividir em parcelas iguais (mensal)"}
            </Button>
            {!(Number(valor) > 0) && (
              <p className="text-xs text-muted-foreground">Preencha o valor do aditivo para dividir.</p>
            )}

            {parcelas.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">
                  Ajuste valor e data de cada parcela, se precisar.
                </p>
                {parcelas.map((p, i) => (
                  <div key={i} className="grid grid-cols-[1.5rem_1fr_1fr_auto] items-center gap-2">
                    <span className="text-xs text-muted-foreground">{i + 1}.</span>
                    <Input
                      aria-label={`Valor da parcela ${i + 1}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={p.valor}
                      onChange={(e) => atualizarParcela(i, "valor", e.target.value)}
                    />
                    <Input
                      aria-label={`Vencimento da parcela ${i + 1}`}
                      type="date"
                      value={p.data}
                      onChange={(e) => atualizarParcela(i, "data", e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remover parcela ${i + 1}`}
                      onClick={() => setParcelas((ps) => ps.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
                <p
                  className={`text-xs ${Math.abs(diferenca) < 0.005 ? "text-muted-foreground" : "text-amber-600"}`}
                >
                  Soma das parcelas: {formatCurrency(somaParcelas)}
                  {Math.abs(diferenca) < 0.005
                    ? " — confere com o valor do aditivo."
                    : ` — difere do valor do aditivo em ${formatCurrency(Math.abs(diferenca))}.`}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending || enviando}>
        {pending ? "Adicionando..." : "Adicionar aditivo"}
      </Button>
    </form>
  );
}
