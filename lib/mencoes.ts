// Menções em comentários ("@david, como está esta tarefa?"). Este arquivo não depende de servidor
// nem de tela: é usado tanto para avisar quem foi mencionado quanto para destacar o nome no texto.

import type { MembroEquipe } from "./types";

export type Mencao = { inicio: number; fim: number; membro: MembroEquipe };

function normalizar(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function primeiroNome(nome: string) {
  return normalizar(nome.trim().split(/\s+/)[0] ?? "");
}

// Como a pessoa pode ser citada: pelo nome completo ou pelo primeiro nome (este só quando não há
// outra pessoa com o mesmo primeiro nome). Os mais longos vêm primeiro, para não casar pela metade.
function candidatos(membros: MembroEquipe[]) {
  const contagem = new Map<string, number>();
  for (const m of membros) contagem.set(primeiroNome(m.nome), (contagem.get(primeiroNome(m.nome)) ?? 0) + 1);
  const lista: { chave: string; membro: MembroEquipe }[] = [];
  for (const m of membros) {
    const completo = normalizar(m.nome.trim());
    const primeiro = primeiroNome(m.nome);
    if (completo) lista.push({ chave: completo, membro: m });
    if (primeiro && primeiro !== completo && contagem.get(primeiro) === 1) lista.push({ chave: primeiro, membro: m });
  }
  return lista.sort((a, b) => b.chave.length - a.chave.length);
}

// O que escrever depois do "@" ao escolher alguém na lista.
export function nomeParaMencao(membro: MembroEquipe, membros: MembroEquipe[]): string {
  const primeiro = membro.nome.trim().split(/\s+/)[0] ?? membro.nome;
  const repetido = membros.filter((m) => primeiroNome(m.nome) === primeiroNome(membro.nome)).length > 1;
  return repetido ? membro.nome.trim() : primeiro;
}

export function encontrarMencoes(texto: string, membros: MembroEquipe[]): Mencao[] {
  if (!texto.includes("@") || membros.length === 0) return [];
  let base = normalizar(texto);
  if (base.length !== texto.length) base = texto.toLowerCase(); // texto com acento decomposto: sem ignorar acentos
  const lista = candidatos(membros);
  const achadas: Mencao[] = [];

  let i = 0;
  while ((i = base.indexOf("@", i)) !== -1) {
    const antes = i === 0 ? " " : base[i - 1];
    // "@" colado numa palavra (e-mail, por exemplo) não é menção.
    if (/[\p{L}\p{N}_.]/u.test(antes)) {
      i++;
      continue;
    }
    const resto = base.slice(i + 1);
    const achado = lista.find(
      (c) => resto.startsWith(c.chave) && !/[\p{L}\p{N}]/u.test(resto[c.chave.length] ?? " ")
    );
    if (achado) {
      const fim = i + 1 + achado.chave.length;
      achadas.push({ inicio: i, fim, membro: achado.membro });
      i = fim;
    } else {
      i++;
    }
  }
  return achadas;
}
