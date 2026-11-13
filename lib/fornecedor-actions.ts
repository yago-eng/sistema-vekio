"use server";

import { getCurrentUser } from "./auth";
import { createClient } from "./supabase/server";
import { FORNECEDORES_SUGERIDOS } from "./types";

const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

// Lista para o campo "Fornecedor". O banco é a fonte (a lista fixa antiga só vale se a tabela ainda
// não existir), para que os removidos pelos administradores não voltem.
export async function listarFornecedoresAction(): Promise<{ nomes: string[]; podeRemover: boolean }> {
  const user = await getCurrentUser();
  const podeRemover = user?.role === "admin";
  const mapa = new Map<string, string>();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("fornecedores").select("nome");
    if (error) throw error;
    for (const r of data ?? []) {
      const nome = String(r.nome ?? "").trim();
      if (nome) mapa.set(normalizar(nome), nome);
    }
  } catch {
    for (const n of FORNECEDORES_SUGERIDOS) mapa.set(normalizar(n), n);
  }
  return { nomes: [...mapa.values()].sort((a, b) => a.localeCompare(b, "pt-BR")), podeRemover };
}

export async function removerFornecedorAction(nome: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return { ok: false, error: "Só administradores podem remover fornecedores." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("fornecedores").delete().eq("nome", nome).select("id");
  if (error) return { ok: false, error: "Não consegui remover agora. Tente de novo." };
  if (!data?.length) {
    return { ok: false, error: "Não consegui remover (falta ativar a remoção no banco de dados)." };
  }
  return { ok: true };
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
  const { nomes: existentes } = await listarFornecedoresAction();
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
