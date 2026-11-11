import { REGIOES, type Regiao, type User } from "./types";

// Sede que abre primeiro (em Obras e em Orçamentos) para cada pessoa. Quem não está na lista
// abre na primeira sede. Para mudar a sede de alguém, ou incluir uma pessoa, é só editar aqui.
const SEDE_POR_EMAIL: Record<string, Regiao> = {
  "antonio@vekio.co": "Florianópolis",
  "gabriel@vekio.co": "Florianópolis",
};

export function regiaoPadrao(user: Pick<User, "email"> | null | undefined): Regiao {
  return (user && SEDE_POR_EMAIL[user.email.trim().toLowerCase()]) || REGIOES[0];
}
