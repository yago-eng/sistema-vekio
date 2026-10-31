"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./auth";
import { createClient } from "./supabase/server";
import { registrarNotificacao } from "./notificacoes";
import { podeUsarTarefas, responsavelPermitido } from "./recursos";
import {
  ARQUIVOS_BUCKET,
  addChecklistItem,
  addTarefaComentario,
  copiarChecklist,
  createTarefa,
  createTarefaAnexo,
  deleteChecklistItem,
  deleteTarefa,
  deleteTarefaAnexo,
  deleteTarefaComentario,
  getTarefa,
  getTarefaAnexo,
  getTarefaDetalhe,
  setChecklistItemFeito,
  updateTarefa,
  updateTarefaStatus,
  type TarefaCampos,
} from "./store";
import {
  TAREFA_PRIORIDADES,
  TAREFA_RECORRENCIAS,
  TAREFA_STATUS,
  type TarefaDetalhe,
  type TarefaRecorrencia,
  type TarefaStatus,
} from "./types";

async function exigirEquipe() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "cliente") redirect("/portal");
  if (!podeUsarTarefas(user)) redirect("/inicio");
  return user;
}

function atualizarTelas(obraId?: string | null) {
  revalidatePath("/tarefas");
  if (obraId) revalidatePath(`/obras/${obraId}`);
}

function hojeSP() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function somarDias(iso: string, dias: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function somarMes(iso: string) {
  const [y, m, dia] = iso.split("-").map(Number);
  const ultimoDiaDoProximo = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(dia, ultimoDiaDoProximo))).toISOString().slice(0, 10);
}

// Próximo prazo de uma tarefa que se repete; nunca devolve uma data já passada.
function proximoPrazo(prazo: string | null, recorrencia: TarefaRecorrencia): string {
  const hoje = hojeSP();
  let atual = prazo ?? hoje;
  const passo = (d: string) =>
    recorrencia === "diaria"
      ? somarDias(d, 1)
      : recorrencia === "semanal"
        ? somarDias(d, 7)
        : recorrencia === "quinzenal"
          ? somarDias(d, 14)
          : somarMes(d);
  do {
    atual = passo(atual);
  } while (atual < hoje);
  return atual;
}

export type SalvarTarefaInput = {
  id?: string;
  obraId: string | null;
  titulo: string;
  descricao: string;
  prioridade: string;
  responsavelId: string | null;
  prazo: string | null;
  recorrencia: string;
};

export async function salvarTarefaAction(input: SalvarTarefaInput): Promise<{ error?: string; id?: string }> {
  const user = await exigirEquipe();

  const titulo = input.titulo.trim();
  if (!titulo) return { error: "Dê um título para a tarefa." };
  if (!TAREFA_PRIORIDADES.some((p) => p.id === input.prioridade)) return { error: "Prioridade inválida." };
  if (!TAREFA_RECORRENCIAS.some((r) => r.id === input.recorrencia)) return { error: "Repetição inválida." };
  const prazo = input.prazo && /^\d{4}-\d{2}-\d{2}$/.test(input.prazo) ? input.prazo : null;
  if (input.recorrencia !== "nenhuma" && !prazo) {
    return { error: "Para repetir a tarefa, defina um prazo." };
  }

  const campos: TarefaCampos = {
    obraId: input.obraId || null,
    titulo,
    descricao: input.descricao.trim(),
    prioridade: input.prioridade as TarefaCampos["prioridade"],
    responsavelId: responsavelPermitido(input.responsavelId || null, user),
    prazo,
    recorrencia: input.recorrencia as TarefaRecorrencia,
  };

  try {
    let id = input.id;
    let responsavelAnterior: string | null = null;
    let obraAnterior: string | null = null;
    if (id) {
      const atual = await getTarefa(id);
      responsavelAnterior = atual?.responsavelId ?? null;
      obraAnterior = atual?.obraId ?? null;
      await updateTarefa(id, campos);
    } else {
      id = await createTarefa({ ...campos, criadoPor: user.id });
    }

    if (campos.responsavelId && campos.responsavelId !== user.id && campos.responsavelId !== responsavelAnterior) {
      await registrarNotificacao({
        tipo: "tarefa",
        titulo: "Tarefa para você",
        descricao: `${user.nome} atribuiu a tarefa "${titulo}" a você.`,
        link: `/tarefas?tarefa=${id}`,
        atorId: user.id,
        atorNome: user.nome,
        destinatarioId: campos.responsavelId,
      });
    }

    atualizarTelas(campos.obraId);
    if (obraAnterior && obraAnterior !== campos.obraId) atualizarTelas(obraAnterior);
    return { id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível salvar a tarefa." };
  }
}

export async function mudarStatusTarefaAction(id: string, status: string): Promise<{ error?: string }> {
  const user = await exigirEquipe();
  if (!TAREFA_STATUS.some((s) => s.id === status)) return { error: "Status inválido." };
  const novo = status as TarefaStatus;

  const tarefa = await getTarefa(id);
  if (!tarefa) return { error: "Tarefa não encontrada." };
  if (tarefa.status === novo) return {};

  try {
    await updateTarefaStatus(id, novo);

    // Tarefa que se repete: ao concluir, já nasce a próxima, com o checklist zerado.
    if (novo === "concluida" && tarefa.status !== "concluida" && tarefa.recorrencia !== "nenhuma") {
      const proximaId = await createTarefa({
        obraId: tarefa.obraId,
        titulo: tarefa.titulo,
        descricao: tarefa.descricao,
        prioridade: tarefa.prioridade,
        responsavelId: tarefa.responsavelId,
        prazo: proximoPrazo(tarefa.prazo, tarefa.recorrencia),
        recorrencia: tarefa.recorrencia,
        criadoPor: user.id,
      });
      await copiarChecklist(id, proximaId);
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível atualizar a tarefa." };
  }

  atualizarTelas(tarefa.obraId);
  return {};
}

export async function excluirTarefaAction(id: string): Promise<{ error?: string }> {
  await exigirEquipe();
  const tarefa = await getTarefa(id);
  const caminhos = await deleteTarefa(id);
  if (caminhos.length > 0) {
    const supabase = await createClient();
    await supabase.storage.from(ARQUIVOS_BUCKET).remove(caminhos);
  }
  atualizarTelas(tarefa?.obraId);
  return {};
}

export async function carregarTarefaAction(id: string): Promise<TarefaDetalhe | null> {
  await exigirEquipe();
  return (await getTarefaDetalhe(id)) ?? null;
}

// --- Checklist ---

export async function adicionarChecklistAction(tarefaId: string, texto: string): Promise<{ error?: string }> {
  await exigirEquipe();
  const t = texto.trim();
  if (!t) return { error: "Escreva o item." };
  try {
    const detalhe = await getTarefaDetalhe(tarefaId);
    await addChecklistItem(tarefaId, t, detalhe?.checklist.length ?? 0);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível adicionar o item." };
  }
  revalidatePath("/tarefas");
  return {};
}

export async function marcarChecklistAction(id: string, feito: boolean) {
  await exigirEquipe();
  await setChecklistItemFeito(id, feito);
  revalidatePath("/tarefas");
}

export async function excluirChecklistAction(id: string) {
  await exigirEquipe();
  await deleteChecklistItem(id);
  revalidatePath("/tarefas");
}

// --- Comentários ---

export async function comentarTarefaAction(tarefaId: string, texto: string): Promise<{ error?: string }> {
  const user = await exigirEquipe();
  const t = texto.trim();
  if (!t) return { error: "Escreva o comentário." };
  try {
    await addTarefaComentario(tarefaId, user.id, t);
    const tarefa = await getTarefa(tarefaId);
    if (tarefa?.responsavelId && tarefa.responsavelId !== user.id) {
      await registrarNotificacao({
        tipo: "tarefa",
        titulo: "Comentário na sua tarefa",
        descricao: `${user.nome} comentou em "${tarefa.titulo}": ${t.length > 80 ? `${t.slice(0, 80)}…` : t}`,
        link: `/tarefas?tarefa=${tarefaId}`,
        atorId: user.id,
        atorNome: user.nome,
        destinatarioId: tarefa.responsavelId,
      });
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível comentar." };
  }
  revalidatePath("/tarefas");
  return {};
}

export async function excluirComentarioAction(id: string) {
  await exigirEquipe();
  await deleteTarefaComentario(id);
  revalidatePath("/tarefas");
}

// --- Anexos (mesmo bucket das obras, na pasta tarefas/) ---

function nomeSeguro(nome: string): string {
  return nome.replace(/[^\w.\-]+/g, "_").slice(-120) || "arquivo";
}

export async function criarUploadTarefaAction(
  tarefaId: string,
  nomeArquivo: string
): Promise<{ ok: true; path: string; token: string } | { ok: false; error: string }> {
  await exigirEquipe();
  const path = `tarefas/${tarefaId}/${crypto.randomUUID()}-${nomeSeguro(nomeArquivo)}`;
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(ARQUIVOS_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "Não foi possível preparar o envio. Tente novamente." };
  return { ok: true, path: data.path, token: data.token };
}

export async function registrarAnexoTarefaAction(input: {
  tarefaId: string;
  caminhoArmazenado: string;
  nomeOriginal: string;
  tamanhoBytes: number;
  mimeType: string;
}): Promise<{ error?: string }> {
  const user = await exigirEquipe();
  if (!input.caminhoArmazenado.startsWith(`tarefas/${input.tarefaId}/`)) {
    return { error: "Arquivo inválido." };
  }
  try {
    await createTarefaAnexo({ ...input, enviadoPor: user.id });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível anexar o arquivo." };
  }
  revalidatePath("/tarefas");
  return {};
}

export async function excluirAnexoTarefaAction(id: string) {
  await exigirEquipe();
  const anexo = await getTarefaAnexo(id);
  await deleteTarefaAnexo(id);
  if (anexo) {
    const supabase = await createClient();
    await supabase.storage.from(ARQUIVOS_BUCKET).remove([anexo.caminhoArmazenado]);
  }
  revalidatePath("/tarefas");
}
