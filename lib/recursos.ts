import type { User } from "./types";

// Tarefas está em fase de testes: só estas contas enxergam e usam o recurso.
// Para liberar para toda a equipe, troque TAREFAS_LIBERADO_PARA_TODOS para true.
const TAREFAS_LIBERADO_PARA_TODOS = false;
const TAREFAS_EMAILS_LIBERADOS = ["yagosmo@gmail.com", "yago@vekio.co"];

export function podeUsarTarefas(user: Pick<User, "email" | "role"> | null | undefined): boolean {
  if (!user || user.role === "cliente") return false;
  if (TAREFAS_LIBERADO_PARA_TODOS) return true;
  return TAREFAS_EMAILS_LIBERADOS.includes(user.email.trim().toLowerCase());
}

// Obras favoritas segue a mesma liberação das Tarefas (fase de testes).
export const podeUsarFavoritas = podeUsarTarefas;

// Enquanto o recurso está restrito, só a própria pessoa pode ser responsável,
// para ninguém receber aviso de algo que ainda não enxerga.
export function limitarResponsaveis<T extends { id: string }>(membros: T[], user: Pick<User, "email" | "role"> & { id: string }): T[] {
  return TAREFAS_LIBERADO_PARA_TODOS ? membros : membros.filter((m) => m.id === user.id);
}

export function responsavelPermitido(responsavelId: string | null, user: { id: string }): string | null {
  return TAREFAS_LIBERADO_PARA_TODOS ? responsavelId : responsavelId === user.id ? responsavelId : null;
}
