import type { MembroEquipe, User } from "./types";

// Tarefas está em fase de testes: só estas contas enxergam e usam o recurso
// (e as obras favoritas). Para liberar para toda a equipe, troque
// TAREFAS_LIBERADO_PARA_TODOS para true.
const TAREFAS_LIBERADO_PARA_TODOS = false;
const TAREFAS_EMAILS_LIBERADOS = [
  "yagosmo@gmail.com",
  "yago@vekio.co",
  "antonio@vekio.co",
  "gabriel@vekio.co",
  "david@vekio.co",
];

function emailLiberado(email: string) {
  return TAREFAS_EMAILS_LIBERADOS.includes(email.trim().toLowerCase());
}

export function podeUsarTarefas(user: Pick<User, "email" | "role"> | null | undefined): boolean {
  if (!user || user.role === "cliente") return false;
  return TAREFAS_LIBERADO_PARA_TODOS || emailLiberado(user.email);
}

// Obras favoritas segue a mesma liberação das Tarefas (fase de testes).
export const podeUsarFavoritas = podeUsarTarefas;

// Enquanto o recurso está restrito, só quem já enxerga as Tarefas pode ser responsável,
// para ninguém receber aviso de algo que ainda não vê. Também tira o e-mail da lista.
// Na lista Gestão (só administradores), só administradores podem ser responsáveis.
export function limitarResponsaveis(membros: MembroEquipe[], opcoes?: { gestao?: boolean }): MembroEquipe[] {
  return membros
    .filter((m) => TAREFAS_LIBERADO_PARA_TODOS || (m.email && emailLiberado(m.email)))
    .filter((m) => !opcoes?.gestao || m.role === "admin")
    .map((m) => ({ id: m.id, nome: m.nome }));
}
