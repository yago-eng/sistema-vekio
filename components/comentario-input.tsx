"use client";

import { useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { encontrarMencoes, nomeParaMencao } from "@/lib/mencoes";
import { cn } from "@/lib/utils";
import type { MembroEquipe } from "@/lib/types";

function normalizar(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Comentário com menções: ao digitar "@", abre a lista de pessoas; escolher uma completa o nome.
export function ComentarioInput({
  valor,
  onChange,
  membros,
  usuarioId,
  placeholder,
  id,
}: {
  valor: string;
  onChange: (valor: string) => void;
  membros: MembroEquipe[];
  usuarioId: string;
  placeholder?: string;
  id?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [cursor, setCursor] = useState(0);
  const [indice, setIndice] = useState(0);
  const [fechado, setFechado] = useState(false);

  // "@" (colado em nada ou depois de espaço) seguido do que já foi digitado, até o cursor.
  const gatilho = /(^|[\s(])@([^\s@]*)$/u.exec(valor.slice(0, cursor));
  const termo = gatilho ? normalizar(gatilho[2]) : null;
  const sugestoes =
    termo === null || fechado
      ? []
      : membros
          .filter((m) => m.id !== usuarioId)
          .filter((m) => normalizar(m.nome).split(/\s+/).some((p) => p.startsWith(termo)) || normalizar(m.nome).startsWith(termo))
          .slice(0, 6);
  const aberto = sugestoes.length > 0;

  function escolher(m: MembroEquipe) {
    if (!gatilho) return;
    const inicio = cursor - gatilho[2].length - 1; // posição do "@"
    const inserido = `@${nomeParaMencao(m, membros)} `;
    const novo = valor.slice(0, inicio) + inserido + valor.slice(cursor);
    onChange(novo);
    setFechado(false);
    setIndice(0);
    const posicao = inicio + inserido.length;
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(posicao, posicao);
      setCursor(posicao);
    });
  }

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        id={id}
        value={valor}
        onChange={(e) => {
          onChange(e.target.value);
          setCursor(e.target.selectionStart ?? e.target.value.length);
          setIndice(0);
          setFechado(false);
        }}
        onSelect={(e) => setCursor(e.currentTarget.selectionStart ?? 0)}
        onKeyDown={(e) => {
          if (!aberto) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setIndice((i) => (i + 1) % sugestoes.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setIndice((i) => (i - 1 + sugestoes.length) % sugestoes.length);
          } else if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            escolher(sugestoes[indice] ?? sugestoes[0]);
          } else if (e.key === "Escape") {
            e.preventDefault();
            setFechado(true);
          }
        }}
        placeholder={placeholder}
      />
      {aberto && (
        <ul
          role="listbox"
          aria-label="Mencionar"
          className="absolute right-0 bottom-full left-0 z-50 mb-1 overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {sugestoes.map((m, i) => (
            <li key={m.id} role="option" aria-selected={i === indice}>
              <button
                type="button"
                // onMouseDown evita que a caixa perca o foco antes do clique valer
                onMouseDown={(e) => {
                  e.preventDefault();
                  escolher(m);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                  i === indice && "bg-muted"
                )}
              >
                <span className="text-muted-foreground">@</span>
                {m.nome}
              </button>
            </li>
          ))}
        </ul>
      )}
      {membros.length > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">Digite @ para mencionar alguém. A pessoa recebe um aviso.</p>
      )}
    </div>
  );
}

// Mostra o comentário com as menções em destaque.
export function TextoComMencoes({ texto, membros }: { texto: string; membros: MembroEquipe[] }) {
  const mencoes = encontrarMencoes(texto, membros);
  if (mencoes.length === 0) return <>{texto}</>;
  const partes: React.ReactNode[] = [];
  let atual = 0;
  mencoes.forEach((m, i) => {
    if (m.inicio > atual) partes.push(texto.slice(atual, m.inicio));
    partes.push(
      <span key={i} className="rounded bg-primary/10 px-1 font-medium text-primary">
        {texto.slice(m.inicio, m.fim)}
      </span>
    );
    atual = m.fim;
  });
  if (atual < texto.length) partes.push(texto.slice(atual));
  return <>{partes}</>;
}
