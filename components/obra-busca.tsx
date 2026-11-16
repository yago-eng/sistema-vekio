"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";

export type ObraBuscaOpcao = { id: string; nome: string };

function normalizar(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// Escolha de obra digitando: a lista abre ao tocar no campo e vai filtrando conforme a pessoa escreve.
// `value` é o id da obra, ou `semValor` quando nenhuma está escolhida.
export function ObraBusca({
  obras,
  value,
  onChange,
  semValor,
  semLabel,
  id,
}: {
  obras: ObraBuscaOpcao[];
  value: string;
  onChange: (valor: string) => void;
  semValor: string;
  semLabel: string;
  id?: string;
}) {
  const escolhida = obras.find((o) => o.id === value);
  const nomeEscolhido = escolhida?.nome ?? "";
  const [texto, setTexto] = useState(nomeEscolhido);
  const [aberto, setAberto] = useState(false);

  const busca = normalizar(texto);
  // Enquanto o texto é só o nome da obra já escolhida, mostra a lista inteira.
  const filtrando = !!busca && texto !== nomeEscolhido;
  const filtradas = filtrando ? obras.filter((o) => normalizar(o.nome).includes(busca)) : obras;
  const mostrarSem = !filtrando || normalizar(semLabel).includes(busca);

  function escolher(valor: string, nome: string) {
    onChange(valor);
    setTexto(nome);
    setAberto(false);
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <Input
          id={id}
          autoComplete="off"
          value={texto}
          placeholder={`${semLabel} — digite para buscar`}
          onChange={(e) => {
            setTexto(e.target.value);
            setAberto(true);
          }}
          onFocus={(e) => {
            setAberto(true);
            e.target.select();
          }}
          onBlur={() => {
            // Pequeno atraso para o toque numa obra ser registrado antes de fechar a lista.
            setTimeout(() => {
              setAberto(false);
              setTexto(nomeEscolhido);
            }, 150);
          }}
          className={escolhida ? "pr-8" : undefined}
        />
        {escolhida && (
          <button
            type="button"
            aria-label="Tirar a obra"
            className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => escolher(semValor, "")}
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      {aberto && (
        <div className="max-h-52 overflow-y-auto rounded-lg border bg-popover shadow-sm">
          {mostrarSem && (
            <button
              type="button"
              className="flex w-full items-center px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => escolher(semValor, "")}
            >
              {semLabel}
            </button>
          )}
          {filtradas.slice(0, 60).map((o) => (
            <button
              key={o.id}
              type="button"
              className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-muted ${o.id === value ? "font-medium" : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => escolher(o.id, o.nome)}
            >
              {o.nome}
            </button>
          ))}
          {filtradas.length === 0 && !mostrarSem && (
            <p className="px-3 py-2 text-sm text-muted-foreground">Nenhuma obra encontrada.</p>
          )}
        </div>
      )}
    </div>
  );
}
