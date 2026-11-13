"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FORNECEDORES_SUGERIDOS } from "@/lib/types";
import { cadastrarFornecedorAction, listarFornecedoresAction } from "@/lib/fornecedor-actions";

function normalizar(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

// Lista compartilhada entre todos os campos de fornecedor da tela (carrega uma vez do servidor).
let listaEmCache: string[] | null = null;
const inicial = [...FORNECEDORES_SUGERIDOS].sort((a, b) => a.localeCompare(b, "pt-BR"));

// Campo de texto livre com lista de sugestões própria (o <datalist> nativo não aparece no celular).
// A pessoa pode escolher um da lista, digitar qualquer nome ou cadastrar um fornecedor novo.
export function FornecedorInput({ id, ref, onChange, onFocus, onBlur, ...props }: React.ComponentProps<typeof Input>) {
  const [aberto, setAberto] = React.useState(false);
  const [texto, setTexto] = React.useState("");
  const [lista, setLista] = React.useState<string[]>(listaEmCache ?? inicial);
  const [cadastrando, setCadastrando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const juntarRef = (el: HTMLInputElement | null) => {
    inputRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) (ref as React.RefObject<HTMLInputElement | null>).current = el;
  };

  React.useEffect(() => {
    if (listaEmCache) return;
    let ativo = true;
    listarFornecedoresAction()
      .then((l) => {
        listaEmCache = l;
        if (ativo) setLista(l);
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);

  const busca = normalizar(texto);
  const opcoes = lista.filter((n) => !busca || normalizar(n).includes(busca));
  const existeIgual = !!busca && lista.some((n) => normalizar(n) === busca);
  const podeCadastrar = busca.length >= 2 && !existeIgual;

  function escolher(nome: string) {
    if (inputRef.current) inputRef.current.value = nome;
    setTexto(nome);
    setErro(null);
    setAberto(false);
  }

  async function cadastrar() {
    setCadastrando(true);
    setErro(null);
    const res = await cadastrarFornecedorAction(texto);
    setCadastrando(false);
    if (!res.ok) {
      setErro(res.error);
      return;
    }
    const nova = [...lista.filter((n) => normalizar(n) !== normalizar(res.nome)), res.nome].sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );
    listaEmCache = nova;
    setLista(nova);
    escolher(res.nome);
  }

  return (
    <div className="relative">
      <Input
        id={id}
        ref={juntarRef}
        autoComplete="off"
        {...props}
        onChange={(e) => {
          setTexto(e.target.value);
          setErro(null);
          setAberto(true);
          onChange?.(e);
        }}
        onFocus={(e) => {
          setTexto(e.target.value);
          setAberto(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          // Pequeno atraso para o toque numa opção ser registrado antes de fechar a lista.
          setTimeout(() => setAberto(false), 150);
          onBlur?.(e);
        }}
      />
      {aberto && (opcoes.length > 0 || podeCadastrar) && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border bg-popover shadow-md">
          {podeCadastrar && (
            <button
              type="button"
              disabled={cadastrando}
              className="flex w-full items-center gap-2 border-b px-3 py-2 text-left text-sm font-medium text-primary hover:bg-muted disabled:opacity-60"
              onMouseDown={(e) => e.preventDefault()}
              onClick={cadastrar}
            >
              <Plus className="size-4 shrink-0" />
              <span className="min-w-0 truncate">
                {cadastrando ? "Cadastrando..." : `Cadastrar novo fornecedor: ${texto.trim()}`}
              </span>
            </button>
          )}
          {opcoes.map((nome) => (
            <button
              key={nome}
              type="button"
              className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-muted"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => escolher(nome)}
            >
              {nome}
            </button>
          ))}
        </div>
      )}
      {erro && <p className="mt-1 text-xs text-destructive">{erro}</p>}
    </div>
  );
}
