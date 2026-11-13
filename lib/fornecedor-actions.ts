"use server";

import { getCurrentUser } from "./auth";
import { createClient } from "./supabase/server";
import { FORNECEDORES_SUGERIDOS } from "./types";

const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

// Lista para o campo "Fornecedor": a lista fixa + os cadastrados pela equipe, sem repetir e em ordem alfabética.
export async function listarFornecedoresAction(): Promise<string[]> {
  const mapa = new Map<string, string>();
  for (const n of FORNECEDORES_SUGERIDOS) mapa.set(normalizar(n), n);
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("fornecedores").select("nome");
    for (const r of data ?? []) {
      const nome = String(r.nome ?? "").trim();
      if (nome) mapa.set(normalizar(nome), nome);
    }
  } catch {
    // Tabela ainda não criada: segue só com a lista fixa.
  }
  return [...mapa.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export async function cadastrarFornecedorAction(
  nomeDigitado: string
): Promise<{ ok: true; nome: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre de novo." };
  const nome = nomeDigitado.replace(/\s+/g, " ").trim();
  if (nome.length < 2) return { ok: false, error: "Digite o nome do fornecedor." };
  if (nome.length > 80) return { ok: false, error: "Nome muito longo (máximo 80 letras)." };

  const supabase = await createClient();
  const existentes = await listarFornecedoresAction();
  const jaTem = existentes.find((n) => normalizar(n) === normalizar(nome));
  if (jaTem) return { ok: true, nome: jaTem };

  const { error } = await supabase.from("fornecedores").insert({ nome, created_by: user.id });
  if (error) {
    if (error.code === "23505") return { ok: true, nome };
    if (error.code === "42P01" || /fornecedores/.test(error.message)) {
      return { ok: false, error: "O cadastro de fornecedores ainda não foi ativado no banco de dados." };
    }
    return { ok: false, error: "Não consegui cadastrar agora. Tente de novo." };
  }
  return { ok: true, nome };
}
