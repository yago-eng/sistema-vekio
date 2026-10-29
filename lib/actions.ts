"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createSession, destroySession, getCurrentUser } from "./auth";
import { createClient } from "./supabase/server";
import {
  ARQUIVOS_BUCKET,
  calcularPrecificacao,
  clearOrcamento,
  createArquivo,
  createCustoFixo,
  createCustosFixosBulk,
  createEtapa,
  createLancamento,
  updateLancamento,
  deleteLancamento,
  createObra,
  createDataImportante,
  createLembrete,
  createRelatorioObra,
  createObraAditivo,
  createPagamento,
  createOrcamento,
  createOrcamentoItem,
  createOrcamentoItens,
  createOrcamentoProposta,
  createPagamentos,
  deleteArquivo,
  updateArquivoCategoria,
  updateArquivoVisibilidade,
  updateAbasVisiveisCliente,
  deleteCustoFixo,
  deleteEtapa,
  deleteDataImportante,
  deleteLembrete,
  deleteRelatorioObra,
  deleteObra,
  deleteObraAditivo,
  deleteOrcamento,
  deleteOrcamentoItem,
  deletePagamento,
  getArquivo,
  getObra,
  getOrcamentoItem,
  getOrcamentoParametros,
  listArquivos,
  listCategorias,
  listOrcamentoItens,
  listOrcamentos,
  renameOrcamento,
  upsertOrcamentoEscopo,
  updateCustoFixo,
  updateCustoFixoStatus,
  updateLembrete,
  updatePagamentoData,
  updatePagamentoRecebido,
  updateEtapa,
  updateObra,
  updateObraPipelineStatus,
  updateOrcamentoItem,
  updateOrcamentoEscopoConteudo,
  upsertOrcamentoParametros,
} from "./store";
import {
  ABAS_CLIENTE,
  ARQUIVO_CATEGORIAS,
  CATEGORIA_MAO_DE_OBRA,
  CORES_ORCAMENTO,
  SETORES_MAO_DE_OBRA,
  CUSTO_FIXO_STATUS,
  OBRA_STATUS,
  ORCAMENTO_TIPOS,
  REGIOES,
  type ArquivoCategoria,
  type CustoFixoStatus,
  type ObraStatus,
  type OrcamentoTipo,
  type PipelineStatus,
  type Regiao,
} from "./types";
import { parseOrcamentoParametros, parseOrcamentoWorkbook } from "./xlsx-import";
import { ORCAMENTO_BASE_TEMPLATE } from "./orcamento-template";
import { enviarEmail } from "./email";
import { lerFluxoPagamentosContrato, lerNotaFiscal, type NotaExtraida, type ParcelaExtraida } from "./ocr";
import { gerarEscopoOrcamento } from "./escopo";
import { classificarArquivo, classificarPorNome } from "./classificar-arquivo";
import {
  marcarNotificacaoLida,
  marcarNotificacoesLidas,
  nomeParaExibir,
  registrarArquivoEnviado,
  registrarGastoLancado,
  registrarNotificacao,
} from "./notificacoes";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/obras");
  return user;
}

// Ações liberadas pra qualquer conta da equipe interna (admin ou equipe),
// só bloqueando contas de cliente.
async function requireTeam() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "cliente") redirect("/portal");
  return user;
}

export async function loginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const { error } = await createSession(email, password);
  if (error) return { error };

  const user = await getCurrentUser();
  redirect(user?.role === "cliente" ? "/portal" : "/inicio");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function createObraAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const nome = String(formData.get("nome") ?? "").trim();
  const endereco = String(formData.get("endereco") ?? "").trim();
  const clienteNome = String(formData.get("clienteNome") ?? "").trim();
  const regiao = String(formData.get("regiao") ?? "") as Regiao;
  // Só admin define o valor de venda; obra criada pela equipe nasce com 0 e o
  // admin preenche depois (o servidor ignora o campo se vier de outro perfil).
  const valorVenda = user!.role === "admin" ? Number(formData.get("valorVenda") ?? 0) : 0;
  const dataInicio = String(formData.get("dataInicio") ?? "");

  if (
    !nome ||
    !endereco ||
    !clienteNome ||
    !dataInicio ||
    valorVenda < 0 ||
    !REGIOES.includes(regiao)
  ) {
    return { error: "Preencha todos os campos corretamente." };
  }

  const obra = await createObra({
    nome,
    endereco,
    clienteNome,
    regiao,
    valorVenda,
    dataInicio,
    createdBy: user!.id,
  });

  await registrarNotificacao({
    tipo: "obra_criada",
    titulo: "Novo cliente / obra",
    descricao: `${nomeParaExibir(user!.nome)} criou o cliente "${obra.nome}" (${obra.regiao}).`,
    obraId: obra.id,
    obraNome: obra.nome,
    link: `/obras/${obra.id}`,
    atorId: user!.id,
    atorNome: user!.nome,
  });

  revalidatePath("/obras");
  redirect(`/obras/${obra.id}`);
}

export async function updateObraStatusAction(obraId: string, status: ObraStatus) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!OBRA_STATUS.some((s) => s.id === status)) return;

  await updateObra(obraId, { status });
  revalidatePath(`/obras/${obraId}`);
  revalidatePath("/obras");
}

// Exclui a obra/cliente e TUDO que pertence a ela (lançamentos, arquivos,
// etapas, pagamentos, orçamentos... via cascade no banco). Só admin; a
// interface exige digitar o nome da obra pra confirmar.
export async function deleteObraAction(obraId: string): Promise<{ error?: string }> {
  await requireAdmin();

  const obra = await getObra(obraId);
  if (!obra) return { error: "Obra não encontrada." };

  const arquivos = await listArquivos(obraId);
  try {
    await deleteObra(obraId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível excluir a obra." };
  }

  // Remove os arquivos do Storage só depois que a obra foi excluída de fato.
  if (arquivos.length > 0) {
    const supabase = await createClient();
    await supabase.storage.from(ARQUIVOS_BUCKET).remove(arquivos.map((a) => a.caminhoArmazenado));
  }

  revalidatePath("/obras");
  revalidatePath("/financeiro");
  revalidatePath("/orcamentos");
  redirect("/obras");
}

export async function updateObraDadosAction(
  obraId: string,
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  await requireAdmin();

  const nome = String(formData.get("nome") ?? "").trim();
  const endereco = String(formData.get("endereco") ?? "").trim();
  const clienteNome = String(formData.get("clienteNome") ?? "").trim();
  const regiao = String(formData.get("regiao") ?? "") as Regiao;
  const valorVenda = Number(formData.get("valorVenda") ?? 0);
  const dataInicio = String(formData.get("dataInicio") ?? "");

  if (
    !nome ||
    !endereco ||
    !clienteNome ||
    !dataInicio ||
    valorVenda < 0 ||
    !REGIOES.includes(regiao)
  ) {
    return { error: "Preencha todos os campos corretamente." };
  }

  await updateObra(obraId, { nome, endereco, clienteNome, regiao, valorVenda, dataInicio });
  revalidatePath(`/obras/${obraId}`);
  revalidatePath("/obras");
  revalidatePath("/clientes");
  revalidatePath("/financeiro");
  return {};
}

export async function moverObraParaOrcamentoAction(obraId: string) {
  await requireAdmin();
  // Volta a obra para o pipeline de orçamentos (some da aba Obras).
  await updateObraPipelineStatus(obraId, "em_andamento");
  revalidatePath("/obras");
  revalidatePath("/orcamentos");
  revalidatePath("/financeiro");
  revalidatePath(`/obras/${obraId}`);
  redirect(`/orcamentos/${obraId}`);
}

export async function createObraAditivoAction(
  obraId: string,
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const descricao = String(formData.get("descricao") ?? "").trim();
  const valor = Number(formData.get("valor") ?? 0);
  const data = String(formData.get("data") ?? "");

  if (!descricao || !data || valor <= 0) {
    return { error: "Preencha descrição, valor e data corretamente." };
  }

  // Parcelas de pagamento do aditivo (opcional): JSON com [{ valor, data }].
  let parcelas: { valor: number; data: string }[] = [];
  const parcelasRaw = String(formData.get("parcelas") ?? "").trim();
  if (parcelasRaw) {
    try {
      const parsed = JSON.parse(parcelasRaw) as { valor: unknown; data: unknown }[];
      parcelas = parsed.map((p) => ({ valor: Number(p.valor), data: String(p.data) }));
    } catch {
      return { error: "Parcelas inválidas. Confira os valores e as datas." };
    }
    if (
      parcelas.length > 60 ||
      parcelas.some((p) => !(p.valor > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(p.data))
    ) {
      return { error: "Preencha valor e data de todas as parcelas (ou remova as que não usar)." };
    }
  }

  // Orçamento anexado: o arquivo já foi enviado direto pro Storage pelo
  // navegador — aqui só registramos a referência.
  const anexoPath = String(formData.get("anexoPath") ?? "").trim();
  let arquivoId: string | null = null;
  if (anexoPath) {
    const arquivo = await createArquivo({
      obraId,
      categoria: "documento",
      nomeOriginal: String(formData.get("anexoNome") ?? "").trim() || "orcamento-aditivo",
      caminhoArmazenado: anexoPath,
      tamanhoBytes: Number(formData.get("anexoTamanho") ?? 0),
      mimeType: String(formData.get("anexoMime") ?? "") || "application/octet-stream",
      enviadoPor: user!.id,
    });
    arquivoId = arquivo.id;
  }

  await createObraAditivo({ obraId, descricao, valor, data, arquivoId, createdBy: user!.id });

  if (parcelas.length > 0) {
    await createPagamentos(
      parcelas.map((p, i) => ({
        obraId,
        descricao: `Aditivo: ${descricao} — Parcela ${i + 1}/${parcelas.length}`,
        valor: p.valor,
        dataPrevista: p.data,
        arquivoId,
        createdBy: user!.id,
      }))
    );
  }

  revalidatePath(`/obras/${obraId}`);
  revalidatePath("/obras");
  revalidatePath("/financeiro");
  revalidatePath("/fluxo-caixa");
  return {};
}

export async function deleteObraAditivoAction(id: string, obraId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  await deleteObraAditivo(id, obraId);
  revalidatePath(`/obras/${obraId}`);
  revalidatePath("/obras");
  revalidatePath("/financeiro");
}

// O setor só vale para a categoria "Mão de obra" e só aceita os valores da
// lista fixa — qualquer outra coisa vira "sem setor".
async function setorValido(categoriaId: string, raw: string): Promise<string | null> {
  if (!(SETORES_MAO_DE_OBRA as readonly string[]).includes(raw)) return null;
  const categorias = await listCategorias();
  return categorias.find((c) => c.id === categoriaId)?.nome === CATEGORIA_MAO_DE_OBRA ? raw : null;
}

export async function updateLancamentoAction(
  obraId: string,
  lancamentoId: string,
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const categoriaId = String(formData.get("categoriaId") ?? "");
  const fornecedor = String(formData.get("fornecedor") ?? "").trim();
  const valor = Number(formData.get("valor") ?? 0);
  const descricao = String(formData.get("descricao") ?? "").trim();
  const data = String(formData.get("data") ?? "");

  if (!categoriaId || !descricao || !data || valor <= 0) {
    return { error: "Preencha todos os campos corretamente." };
  }

  const setor = await setorValido(categoriaId, String(formData.get("setor") ?? ""));
  await updateLancamento(lancamentoId, { categoriaId, fornecedor, setor, valor, descricao, data });

  revalidatePath(`/obras/${obraId}`);
  return {};
}

export async function deleteLancamentoAction(obraId: string, lancamentoId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  await deleteLancamento(lancamentoId);
  revalidatePath(`/obras/${obraId}`);
}

// Lançamento avulso: fora da página da obra, escolhendo a obra pelo nome.
export async function createLancamentoAvulsoAction(
  _prevState: { error?: string; ok?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const obraId = String(formData.get("obraId") ?? "");
  const categoriaId = String(formData.get("categoriaId") ?? "");
  const fornecedor = String(formData.get("fornecedor") ?? "").trim();
  const valor = Number(formData.get("valor") ?? 0);
  const descricao = String(formData.get("descricao") ?? "").trim();
  const data = String(formData.get("data") ?? "");
  // A nota, quando anexada, já foi enviada direto pro Storage pelo navegador
  // (bypassando o limite de 4,5MB de corpo de requisição) — aqui só
  // recebemos a referência dela.
  const notaPath = String(formData.get("notaPath") ?? "").trim() || null;
  const notaNome = String(formData.get("notaNome") ?? "").trim();
  const notaTamanho = Number(formData.get("notaTamanho") ?? 0);
  const notaMime = String(formData.get("notaMime") ?? "");
  const temNota = !!notaPath;

  if (!obraId) return { error: "Selecione uma obra." };
  if (!categoriaId) return { error: "Selecione uma categoria." };
  if (!data) return { error: "Preencha a data." };
  if (!descricao && !temNota) {
    return { error: "Preencha a descrição ou anexe a foto da nota." };
  }
  if (valor <= 0 && !temNota) {
    return { error: "Informe o valor ou anexe a foto da nota (um dos dois é obrigatório)." };
  }

  // Se anexou a nota, registra como arquivo da obra.
  if (temNota) {
    await createArquivo({
      obraId,
      categoria: "nota_fiscal",
      nomeOriginal: notaNome || "nota-fiscal",
      caminhoArmazenado: notaPath!,
      tamanhoBytes: notaTamanho,
      mimeType: notaMime || "application/octet-stream",
      enviadoPor: user.id,
    });
  }

  const descricaoFinal =
    descricao ||
    (temNota ? `Nota fiscal anexada (${notaNome}) — aguardando conferência` : descricao);

  const setor = await setorValido(categoriaId, String(formData.get("setor") ?? ""));
  await createLancamento({
    obraId,
    categoriaId,
    fornecedor,
    setor,
    valor: valor > 0 ? valor : 0,
    descricao:
      temNota && valor <= 0 && descricao
        ? `${descricao} (valor a confirmar na nota anexada)`
        : descricaoFinal,
    data,
    lancadoPor: user.id,
  });

  const obraDoGasto = await getObra(obraId);
  await registrarGastoLancado({
    atorId: user.id,
    atorNome: user.nome,
    obraId,
    obraNome: obraDoGasto?.nome ?? "",
  });

  revalidatePath(`/obras/${obraId}`);
  revalidatePath("/obras");
  revalidatePath("/financeiro");
  return { ok: true };
}

// --- Cronograma ---

export async function createEtapaAction(
  obraId: string,
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const nome = String(formData.get("nome") ?? "").trim();
  const dataInicio = String(formData.get("dataInicio") ?? "");
  const dataFim = String(formData.get("dataFim") ?? "");

  if (!nome || !dataInicio || !dataFim || dataFim < dataInicio) {
    return { error: "Preencha nome e datas corretamente (fim não pode ser antes do início)." };
  }

  await createEtapa({ obraId, nome, dataInicio, dataFim });
  revalidatePath(`/obras/${obraId}`);
  return {};
}

export async function updateEtapaAction(
  obraId: string,
  etapaId: string,
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const nome = String(formData.get("nome") ?? "").trim();
  const dataInicio = String(formData.get("dataInicio") ?? "");
  const dataFim = String(formData.get("dataFim") ?? "");

  if (!nome || !dataInicio || !dataFim || dataFim < dataInicio) {
    return { error: "Preencha nome e datas corretamente (fim não pode ser antes do início)." };
  }

  await updateEtapa(etapaId, { nome, dataInicio, dataFim });
  revalidatePath(`/obras/${obraId}`);
  return {};
}

export async function deleteEtapaAction(obraId: string, etapaId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await deleteEtapa(etapaId);
  revalidatePath(`/obras/${obraId}`);
}

// --- Documentos ---

// O Storage do Supabase rejeita chaves com espaço, acento ou outros
// caracteres fora de um conjunto seguro ("Invalid key"). O nome original
// (com espaços/acentos) continua sendo exibido normalmente — só a chave de
// armazenamento em si precisa ser sanitizada.
function sanitizeNomeArquivo(nome: string): string {
  const semAcento = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return semAcento.replace(/[^a-zA-Z0-9._-]/g, "_");
}

// Upload direto do navegador pro Storage (bypassa o limite de 4,5MB de
// corpo de requisição das Vercel Functions/Server Actions — o arquivo em si
// nunca passa pelo nosso servidor, só o token assinado e depois os metadados).
export async function criarUploadAssinadoAction(
  obraId: string,
  nomeArquivo: string
): Promise<{ ok: true; path: string; token: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const storagePath = `${obraId}/${crypto.randomUUID()}-${sanitizeNomeArquivo(nomeArquivo)}`;
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(ARQUIVOS_BUCKET)
    .createSignedUploadUrl(storagePath);
  if (error || !data) {
    return { ok: false, error: "Não foi possível preparar o envio. Tente novamente." };
  }
  return { ok: true, path: data.path, token: data.token };
}

export async function registrarArquivoAction(input: {
  obraId: string;
  caminhoArmazenado: string;
  nomeOriginal: string;
  tamanhoBytes: number;
  mimeType: string;
  categoria: string;
  visivelCliente: boolean;
  legenda?: string;
}): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // "auto" (padrão do formulário): categoria pelo tipo/nome do arquivo, na hora.
  // PDFs ambíguos entram como "documento" e a IA refina DEPOIS da resposta
  // (after), pra nunca segurar o envio enquanto lê o PDF.
  // Qualquer categoria escolhida à mão é respeitada.
  const manual = ARQUIVO_CATEGORIAS.some((c) => c.id === input.categoria);
  const rapida = manual ? null : classificarPorNome(input.nomeOriginal, input.mimeType);
  const categoria: ArquivoCategoria = manual
    ? (input.categoria as ArquivoCategoria)
    : (rapida ?? "documento");
  const refinarComIA = !manual && !rapida && input.mimeType === "application/pdf";

  let arquivo;
  try {
    arquivo = await createArquivo({
      obraId: input.obraId,
      categoria,
      nomeOriginal: input.nomeOriginal,
      caminhoArmazenado: input.caminhoArmazenado,
      tamanhoBytes: input.tamanhoBytes,
      mimeType: input.mimeType,
      enviadoPor: user.id,
      legenda: input.legenda?.trim() || null,
    });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Não foi possível registrar o arquivo enviado.",
    };
  }
  // O cronograma enviado é feito pra ser visto na aba Cronograma da Área do Cliente.
  if (input.visivelCliente || categoria === "cronograma") await updateArquivoVisibilidade(arquivo.id, true);

  if (refinarComIA) {
    const novoId = arquivo.id;
    after(async () => {
      try {
        const ia = await classificarArquivo({
          nome: input.nomeOriginal,
          mimeType: input.mimeType,
          lerBytes: () => baixarBytesArquivo(input.caminhoArmazenado),
        });
        if (ia !== "documento") await updateArquivoCategoria(novoId, ia);
      } catch {
        // fica como "documento"
      }
    });
  }

  const obraDoArquivo = await getObra(input.obraId);
  await registrarArquivoEnviado({
    atorId: user.id,
    atorNome: user.nome,
    obraId: input.obraId,
    obraNome: obraDoArquivo?.nome ?? "",
    mimeType: input.mimeType,
  });

  revalidatePath(`/obras/${input.obraId}`);
  revalidatePath(`/orcamentos/${input.obraId}`);
  return {};
}

async function baixarBytesArquivo(caminho: string): Promise<Buffer | null> {
  const supabase = await createClient();
  const { data } = await supabase.storage.from(ARQUIVOS_BUCKET).download(caminho);
  return data ? Buffer.from(await data.arrayBuffer()) : null;
}

// Reorganiza os arquivos que ficaram na categoria padrão "Documento",
// reclassificando pelo tipo/conteúdo. Respeita o limite de tempo da função:
// só poucos PDFs por vez passam pela IA; o botão pode ser clicado de novo.
export async function organizarArquivosAction(
  obraId: string
): Promise<{ movidos: number; restantes: number }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const arquivos = (await listArquivos(obraId)).filter((a) => a.categoria === "documento");
  let movidos = 0;
  let restantes = 0;
  let usosIA = 0;
  for (const a of arquivos) {
    let nova = classificarPorNome(a.nomeOriginal, a.mimeType);
    if (!nova && a.mimeType === "application/pdf") {
      if (usosIA >= 6) {
        restantes++;
        continue;
      }
      usosIA++;
      nova = await classificarArquivo({
        nome: a.nomeOriginal,
        mimeType: a.mimeType,
        lerBytes: () => baixarBytesArquivo(a.caminhoArmazenado),
      });
    }
    if (nova && nova !== a.categoria) {
      await updateArquivoCategoria(a.id, nova);
      movidos++;
    }
  }
  revalidatePath(`/obras/${obraId}`);
  revalidatePath(`/orcamentos/${obraId}`);
  return { movidos, restantes };
}

export async function deleteArquivoAction(obraId: string, arquivoId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const arquivo = await getArquivo(arquivoId);
  if (arquivo) {
    const supabase = await createClient();
    await supabase.storage.from(ARQUIVOS_BUCKET).remove([arquivo.caminhoArmazenado]);
  }
  await deleteArquivo(arquivoId);
  revalidatePath(`/obras/${obraId}`);
}

export async function toggleArquivoVisivelClienteAction(
  obraId: string,
  arquivoId: string,
  visivelCliente: boolean
) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  await updateArquivoVisibilidade(arquivoId, visivelCliente);
  revalidatePath(`/obras/${obraId}`);
  revalidatePath(`/orcamentos/${obraId}`);
}

// --- Área do Cliente ---

const SITE_ORIGIN = "https://sistema-vekio.vercel.app";

// Autoatendimento: o cliente pede um novo link de acesso sozinho, sem
// precisar pedir pra equipe reenviar. Nunca revela se o e-mail tem ou não
// acesso — sempre responde com a mesma mensagem genérica de sucesso.
export async function solicitarAcessoClienteAction(
  _prevState: { ok?: boolean; error?: string } | undefined,
  formData: FormData
): Promise<{ ok?: boolean; error?: string }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { error: "Informe um e-mail válido." };
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("email", email)
    .maybeSingle();

  if (profile && profile.role === "cliente") {
    await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: `${SITE_ORIGIN}/auth/callback?next=/portal` },
    });
  }

  return { ok: true };
}

// Cliente já logado (via link do e-mail) define uma senha própria, pra
// entrar direto por e-mail+senha nas próximas vezes, sem depender de link.
export async function definirSenhaClienteAction(
  _prevState: { ok?: boolean; error?: string } | undefined,
  formData: FormData
): Promise<{ ok?: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "cliente") redirect("/obras");

  const senha = String(formData.get("senha") ?? "");
  const confirmarSenha = String(formData.get("confirmarSenha") ?? "");
  if (senha.length < 6) {
    return { error: "A senha precisa ter pelo menos 6 caracteres." };
  }
  if (senha !== confirmarSenha) {
    return { error: "As senhas não coincidem." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) return { error: error.message };

  await supabase.from("profiles").update({ senha_definida: true }).eq("id", user.id);
  revalidatePath("/portal");
  return { ok: true };
}

export async function convidarClienteAction(
  obraId: string,
  _prevState: { error?: string; ok?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  await requireTeam();

  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!nome || !email || !email.includes("@")) {
    return { error: "Informe nome e e-mail válidos." };
  }

  const supabase = await createClient();

  // shouldCreateUser: true é seguro tanto pra e-mail novo quanto já
  // existente no Supabase Auth — cria o usuário se não existir, ou só manda
  // um novo link de acesso se já existir. Não dá erro em nenhum dos casos.
  const { error: otpError } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${SITE_ORIGIN}/auth/callback?next=/portal` },
  });
  if (otpError) return { error: `Erro ao convidar: ${otpError.message}` };

  // Garante o perfil com role="cliente" via função no banco (RPC), que
  // busca o usuário direto em auth.users — funciona tanto para um usuário
  // recém-criado (cujo perfil o gatilho de signup ainda não tenha criado a
  // tempo) quanto para um e-mail que já tinha conta de autenticação sem
  // perfil correspondente (era exatamente esse o caso que travava com
  // "não foi possível localizar o novo perfil", e também o que deixava um
  // perfil pré-existente sem o role correto).
  const { data: clienteId, error: profileError } = await supabase.rpc("ensure_cliente_profile", {
    target_email: email,
    target_nome: nome,
  });
  if (profileError || !clienteId) {
    return {
      error:
        "Convite enviado, mas não foi possível preparar o perfil do cliente. Tente novamente em instantes.",
    };
  }

  const todasAbas = ABAS_CLIENTE.map((a) => a.id);
  const abasSelecionadas = formData.getAll("abas").map(String);
  const abas = ABAS_CLIENTE.filter((a) => abasSelecionadas.includes(a.id)).map((a) => a.id);

  const { error: linkError } = await supabase.from("cliente_obras").upsert(
    { cliente_id: clienteId, obra_id: obraId, abas_visiveis: abas.length > 0 ? abas : todasAbas },
    { onConflict: "cliente_id,obra_id" }
  );
  if (linkError) return { error: linkError.message };

  revalidatePath(`/obras/${obraId}`);
  revalidatePath("/clientes");
  return { ok: true };
}

export async function atualizarAbasVisiveisClienteAction(
  clienteId: string,
  obraId: string,
  abas: string[]
) {
  await requireTeam();
  const validas = ABAS_CLIENTE.filter((a) => abas.includes(a.id)).map((a) => a.id);
  await updateAbasVisiveisCliente(clienteId, obraId, validas);
  revalidatePath("/clientes");
  revalidatePath(`/obras/${obraId}`);
}

export async function removerClienteAction(obraId: string, clienteId: string) {
  await requireTeam();
  const supabase = await createClient();
  await supabase.from("cliente_obras").delete().eq("obra_id", obraId).eq("cliente_id", clienteId);
  revalidatePath(`/obras/${obraId}`);
  revalidatePath("/clientes");
}

export async function updateClienteNomeAction(
  clienteId: string,
  obraId: string | null,
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  await requireTeam();

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { error: "Informe o nome do cliente." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ nome }).eq("id", clienteId);
  if (error) return { error: "Não foi possível salvar." };

  revalidatePath("/clientes");
  if (obraId) revalidatePath(`/obras/${obraId}`);
  return {};
}

// --- Formalização de orçamento (escopo) ---

const DOCUMENTOS_SUPORTADOS = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export async function gerarEscopoOrcamentoAction(
  obraId: string,
  orcamentoId: string
): Promise<{ error?: string; ok?: boolean; aviso?: string }> {
  const user = await requireAdmin();

  const obra = await getObra(obraId);
  if (!obra) return { error: "Obra não encontrada." };

  const [itens, arquivos, parametros] = await Promise.all([
    listOrcamentoItens(orcamentoId),
    listArquivos(obraId),
    getOrcamentoParametros(orcamentoId),
  ]);

  const suportados = arquivos.filter((a) => DOCUMENTOS_SUPORTADOS.has(a.mimeType));
  const projetos = suportados.filter((a) => a.categoria === "projeto");

  if (itens.length === 0 && suportados.length === 0) {
    return {
      error:
        "Cadastre os itens do orçamento ou anexe os documentos do projeto (aba Documentos) antes de gerar o escopo.",
    };
  }
  if (itens.length === 0 && obra.valorVenda <= 0) {
    return {
      error:
        "Defina um valor de venda para a obra (editando os dados da obra) ou cadastre os itens do orçamento antes de gerar o escopo.",
    };
  }

  // Sempre recalcula e trava o valor de venda final na hora de gerar o
  // escopo, para não exibir um valor desatualizado (ex.: se o admin alterou
  // itens do orçamento mas esqueceu de clicar em "Aplicar valor calculado").
  // Sem itens cadastrados, não há custo de obra pra calcular a partir daí —
  // nesse caso o valor de venda já definido na obra é usado como base, e a
  // quebra entre valor da obra/tributação é feita pelos mesmos percentuais.
  let valorVendaFinal: number;
  let valorObraFinal: number;
  let tributacaoFinal: number;
  if (itens.length > 0) {
    const custoDaObra = itens.reduce((sum, i) => sum + i.valorTotal, 0);
    const precificacao = calcularPrecificacao(custoDaObra, parametros);
    valorVendaFinal = Math.round(precificacao.valorVenda * 100) / 100;
    valorObraFinal = Math.round(precificacao.baseCalculo * 100) / 100;
    tributacaoFinal = Math.round((precificacao.rtValor + precificacao.impostoValor) * 100) / 100;
  } else {
    valorVendaFinal = obra.valorVenda;
    tributacaoFinal = Math.round(valorVendaFinal * ((parametros.rt + parametros.imposto) / 100) * 100) / 100;
    valorObraFinal = Math.round((valorVendaFinal - tributacaoFinal) * 100) / 100;
  }
  if (valorVendaFinal !== obra.valorVenda) {
    await updateObra(obraId, { valorVenda: valorVendaFinal });
  }

  const supabase = await createClient();
  const candidatos = (projetos.length > 0 ? projetos : suportados).slice(0, 5);
  const documentos: { buffer: Buffer; mediaType: string; nomeOriginal: string }[] = [];
  for (const arquivo of candidatos) {
    const { data: blob, error } = await supabase.storage
      .from(ARQUIVOS_BUCKET)
      .download(arquivo.caminhoArmazenado);
    if (error || !blob) continue;
    const buffer = Buffer.from(await blob.arrayBuffer());
    documentos.push({ buffer, mediaType: arquivo.mimeType, nomeOriginal: arquivo.nomeOriginal });
  }

  const resultado = await gerarEscopoOrcamento({
    obraNome: obra.nome,
    clienteNome: obra.clienteNome,
    endereco: obra.endereco,
    valorVenda: valorVendaFinal,
    itens: itens.map((i) => ({
      etapa: i.etapa,
      descricao: i.descricao,
      quantidade: i.quantidade,
      unidade: i.unidade,
    })),
    documentos,
  });
  if (!resultado.ok) return { error: resultado.error };

  await upsertOrcamentoEscopo(
    orcamentoId,
    {
      ...resultado.data,
      valorObra: valorObraFinal,
      tributacao: tributacaoFinal,
      totalComTributacao: valorVendaFinal,
    },
    user.id
  );
  revalidatePath(`/obras/${obraId}/escopo`);
  revalidatePath(`/obras/${obraId}`);
  revalidatePath(`/orcamentos/${obraId}`);

  const documentosIgnorados = resultado.data.documentosIgnorados;
  return {
    ok: true,
    aviso:
      documentosIgnorados && documentosIgnorados.length > 0
        ? `Gerado, mas não consegui ler: ${documentosIgnorados.join(", ")}. Considere reenviar esse(s) arquivo(s).`
        : undefined,
  };
}

export async function updateOrcamentoEscopoAction(
  obraId: string,
  orcamentoId: string,
  conteudo: {
    etapas: { nome: string; itens: string[] }[];
    prazoEstimado: string | null;
    condicoes: string;
    valorObra: number;
    tributacao: number;
    totalComTributacao: number;
  }
): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await updateOrcamentoEscopoConteudo(orcamentoId, conteudo);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível salvar as alterações." };
  }
  revalidatePath(`/obras/${obraId}/escopo`);
  return {};
}

// --- Orçamento ---

export async function createOrcamentoAction(
  obraId: string,
  _prevState: { error?: string; id?: string } | undefined,
  formData: FormData
): Promise<{ error?: string; id?: string }> {
  await requireAdmin();
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { error: "Dê um nome para a planilha." };

  const orcamento = await createOrcamento(obraId, nome);

  // Opcional: copia a planilha (itens + parâmetros de precificação) de outro
  // orçamento da mesma obra. O escopo gerado não é copiado — cada orçamento
  // gera o seu.
  const copiarDe = String(formData.get("copiarDe") ?? "");
  const existentes = await listOrcamentos(obraId);
  if (!copiarDe || copiarDe === "nenhum") {
    // Planilha em branco: começa com a mesma precificação da primeira planilha
    // da obra (margem, RT, imposto, meta) — daí em diante cada planilha tem a sua.
    const base = existentes.find((o) => o.id !== orcamento.id);
    if (base) {
      const p = await getOrcamentoParametros(base.id);
      await upsertOrcamentoParametros(orcamento.id, {
        margemVekio: p.margemVekio,
        rt: p.rt,
        imposto: p.imposto,
        lucratividadeEsperada: p.lucratividadeEsperada,
      });
    }
  } else {
    if (existentes.some((o) => o.id === copiarDe)) {
      const [itens, parametros] = await Promise.all([
        listOrcamentoItens(copiarDe),
        getOrcamentoParametros(copiarDe),
      ]);
      if (itens.length > 0) {
        await createOrcamentoItens(
          orcamento.id,
          itens.map((i) => ({
            tipo: i.tipo,
            etapa: i.etapa,
            descricao: i.descricao,
            valorUnitario: i.valorUnitario,
            quantidade: i.quantidade,
            unidade: i.unidade,
            valorTotal: i.valorTotal,
            observacao: i.observacao,
            negrito: i.negrito,
            cor: i.cor,
          }))
        );
      }
      await upsertOrcamentoParametros(orcamento.id, {
        margemVekio: parametros.margemVekio,
        rt: parametros.rt,
        imposto: parametros.imposto,
        lucratividadeEsperada: parametros.lucratividadeEsperada,
      });
    }
  }

  revalidatePath(`/obras/${obraId}`);
  revalidatePath(`/orcamentos/${obraId}`);
  return { id: orcamento.id };
}

export async function renameOrcamentoAction(
  obraId: string,
  orcamentoId: string,
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  await requireAdmin();
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { error: "Dê um nome para a planilha." };

  await renameOrcamento(orcamentoId, nome);
  revalidatePath(`/obras/${obraId}`);
  revalidatePath(`/orcamentos/${obraId}`);
  return {};
}

export async function deleteOrcamentoAction(
  obraId: string,
  orcamentoId: string
): Promise<{ error?: string }> {
  await requireAdmin();
  const orcamentos = await listOrcamentos(obraId);
  if (orcamentos.length <= 1) {
    return { error: "Não é possível excluir a única planilha de orçamento da obra." };
  }
  await deleteOrcamento(orcamentoId);
  revalidatePath(`/obras/${obraId}`);
  revalidatePath(`/orcamentos/${obraId}`);
  return {};
}

export async function importOrcamentoAction(
  obraId: string,
  orcamentoId: string,
  _prevState: { error?: string; importados?: number } | undefined,
  formData: FormData
): Promise<{ error?: string; importados?: number }> {
  await requireAdmin();

  const file = formData.get("arquivo") as File | null;
  if (!file || file.size === 0) {
    return { error: "Selecione um arquivo Excel (.xlsx)." };
  }

  let itens;
  let parametros;
  try {
    const buffer = await file.arrayBuffer();
    itens = parseOrcamentoWorkbook(buffer);
    parametros = parseOrcamentoParametros(buffer);
  } catch {
    return { error: "Não foi possível ler esse arquivo. Confirme que é um .xlsx válido." };
  }

  if (itens.length === 0) {
    return {
      error:
        "Nenhum item reconhecido nesse arquivo. Esperado abas com colunas Serviço/Material ou Serviço/Equipe.",
    };
  }

  const substituir = formData.get("substituir") === "on";
  if (substituir) await clearOrcamento(orcamentoId);
  await createOrcamentoItens(orcamentoId, itens);
  if (parametros) await upsertOrcamentoParametros(orcamentoId, parametros);

  revalidatePath(`/obras/${obraId}`);
  revalidatePath(`/orcamentos/${obraId}`);
  return { importados: itens.length };
}

export async function carregarBaseOrcamentoAction(obraId: string, orcamentoId: string) {
  await requireAdmin();

  // Carregar a base sempre resulta EXATAMENTE na base padrão — nunca soma
  // em cima de itens que já existiam (evita duplicar/inflar o total).
  await clearOrcamento(orcamentoId);

  const itens = ORCAMENTO_BASE_TEMPLATE.map((it) => ({
    tipo: it.tipo,
    etapa: it.etapa,
    descricao: it.descricao,
    valorUnitario: it.valorUnitario,
    quantidade: it.quantidade,
    unidade: it.unidade,
    valorTotal: it.valorUnitario * it.quantidade,
    observacao: it.observacao,
  }));
  await createOrcamentoItens(orcamentoId, itens);

  revalidatePath(`/obras/${obraId}`);
  revalidatePath(`/orcamentos/${obraId}`);
}

export async function createOrcamentoItemAction(
  obraId: string,
  orcamentoId: string,
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  await requireAdmin();

  const tipo = String(formData.get("tipo") ?? "") as OrcamentoTipo;
  const etapa = String(formData.get("etapa") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const valorUnitario = Number(formData.get("valorUnitario") ?? 0);
  const quantidade = Number(formData.get("quantidade") ?? 1);
  const unidade = String(formData.get("unidade") ?? "").trim();

  if (!ORCAMENTO_TIPOS.some((t) => t.id === tipo) || !etapa || !descricao || valorUnitario < 0) {
    return { error: "Preencha etapa, descrição e valor corretamente." };
  }

  await createOrcamentoItem({
    orcamentoId,
    tipo,
    etapa,
    descricao,
    valorUnitario,
    quantidade: quantidade || 1,
    unidade,
    valorTotal: valorUnitario * (quantidade || 1),
    observacao: "",
  });

  revalidatePath(`/obras/${obraId}`);
  revalidatePath(`/orcamentos/${obraId}`);
  return {};
}

export async function addOrcamentoLinhaAction(obraId: string, orcamentoId: string, etapa: string) {
  await requireAdmin();

  await createOrcamentoItem({
    orcamentoId,
    tipo: "material",
    etapa,
    descricao: "Novo item",
    valorUnitario: 0,
    quantidade: 1,
    unidade: "-",
    valorTotal: 0,
    observacao: "",
  });

  revalidatePath(`/obras/${obraId}`);
  revalidatePath(`/orcamentos/${obraId}`);
}

export async function updateOrcamentoItemValorAction(
  obraId: string,
  itemId: string,
  field: "valorUnitario" | "quantidade",
  value: number
) {
  await requireAdmin();

  const item = await getOrcamentoItem(itemId);
  if (!item) return;

  const valorUnitario = field === "valorUnitario" ? value : item.valorUnitario;
  const quantidade = field === "quantidade" ? value : item.quantidade;

  await updateOrcamentoItem(itemId, {
    [field]: value,
    valorTotal: valorUnitario * quantidade,
  });
  revalidatePath(`/obras/${obraId}`);
  revalidatePath(`/orcamentos/${obraId}`);
}

export async function updateOrcamentoItemTextoAction(
  obraId: string,
  itemId: string,
  field: "descricao" | "etapa" | "unidade",
  value: string
) {
  await requireAdmin();
  await updateOrcamentoItem(itemId, { [field]: value });
  revalidatePath(`/obras/${obraId}`);
  revalidatePath(`/orcamentos/${obraId}`);
}

export async function updateOrcamentoItemFormatoAction(
  obraId: string,
  itemId: string,
  formato: { negrito: boolean; cor: string | null }
) {
  await requireAdmin();
  const cor = CORES_ORCAMENTO.some((c) => c.id === formato.cor) ? formato.cor : null;
  await updateOrcamentoItem(itemId, { negrito: !!formato.negrito, cor });
  revalidatePath(`/obras/${obraId}`);
  revalidatePath(`/orcamentos/${obraId}`);
}

export async function deleteOrcamentoItemAction(obraId: string, itemId: string) {
  await requireAdmin();
  await deleteOrcamentoItem(itemId);
  revalidatePath(`/obras/${obraId}`);
  revalidatePath(`/orcamentos/${obraId}`);
}

export async function updateOrcamentoParametrosAction(
  obraId: string,
  orcamentoId: string,
  field: "margemVekio" | "rt" | "imposto" | "lucratividadeEsperada",
  value: number
) {
  await requireAdmin();
  await upsertOrcamentoParametros(orcamentoId, { [field]: value });
  revalidatePath(`/obras/${obraId}`);
}

export async function aplicarValorVendaCalculadoAction(obraId: string, orcamentoId: string) {
  await requireAdmin();

  const [obra, itens, parametros] = await Promise.all([
    getObra(obraId),
    listOrcamentoItens(orcamentoId),
    getOrcamentoParametros(orcamentoId),
  ]);
  if (!obra) return;

  const custoDaObra = itens.reduce((sum, i) => sum + i.valorTotal, 0);
  const { valorVenda } = calcularPrecificacao(custoDaObra, parametros);
  await updateObra(obraId, { valorVenda: Math.round(valorVenda * 100) / 100 });

  revalidatePath(`/obras/${obraId}`);
}

// --- Pipeline de orçamentos ---

export async function createOrcamentoPropostaAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const user = await requireAdmin();

  const nome = String(formData.get("nome") ?? "").trim();
  const clienteNome = String(formData.get("clienteNome") ?? "").trim();
  const regiao = String(formData.get("regiao") ?? "") as Regiao;
  const dataInicio = String(formData.get("dataInicio") ?? "");

  if (!nome || !clienteNome || !dataInicio || !REGIOES.includes(regiao)) {
    return { error: "Preencha todos os campos corretamente." };
  }

  const proposta = await createOrcamentoProposta({
    nome,
    clienteNome,
    regiao,
    dataInicio,
    createdBy: user.id,
  });

  await registrarNotificacao({
    tipo: "proposta_criada",
    titulo: "Nova proposta de orçamento",
    descricao: `${nomeParaExibir(user.nome)} criou a proposta "${proposta.nome}" (${proposta.regiao}).`,
    obraId: proposta.id,
    obraNome: proposta.nome,
    link: `/orcamentos/${proposta.id}`,
    atorId: user.id,
    atorNome: user.nome,
  });

  revalidatePath("/orcamentos");
  redirect(`/orcamentos/${proposta.id}`);
}

export async function updateObraPipelineStatusAction(
  obraId: string,
  pipelineStatus: Extract<PipelineStatus, "efetivado" | "negado">
) {
  const user = await requireAdmin();
  await updateObraPipelineStatus(obraId, pipelineStatus);
  if (pipelineStatus === "efetivado") {
    const obra = await getObra(obraId);
    await registrarNotificacao({
      tipo: "orcamento_efetivado",
      titulo: "Orçamento efetivado",
      descricao: `O orçamento "${obra?.nome ?? ""}" foi efetivado por ${nomeParaExibir(user.nome)}.`,
      obraId,
      obraNome: obra?.nome ?? null,
      link: `/obras/${obraId}`,
      atorId: user.id,
      atorNome: user.nome,
    });
  }
  revalidatePath("/orcamentos");
  revalidatePath("/obras");
  revalidatePath("/financeiro");
  revalidatePath(`/orcamentos/${obraId}`);
  revalidatePath(`/obras/${obraId}`);
  if (pipelineStatus === "efetivado") redirect(`/obras/${obraId}`);
}

// --- Notificações ---

export async function salvarPushSubscriptionAction(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}): Promise<{ error?: string }> {
  const user = await requireTeam();
  if (!sub.endpoint || !sub.p256dh || !sub.auth) return { error: "Assinatura inválida." };
  const supabase = await createClient();
  // O mesmo aparelho pode trocar de pessoa logada: remove o registro antigo e grava de novo.
  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: user.id,
    endpoint: sub.endpoint,
    p256dh: sub.p256dh,
    auth: sub.auth,
    user_agent: sub.userAgent?.slice(0, 300) ?? null,
  });
  return error ? { error: error.message } : {};
}

export async function removerPushSubscriptionAction(endpoint: string) {
  const user = await requireTeam();
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user.id);
}

export async function marcarNotificacaoLidaAction(notificacaoId: string) {
  const user = await requireTeam();
  await marcarNotificacaoLida(user.id, notificacaoId);
}

export async function marcarNotificacoesLidasAction() {
  const user = await requireTeam();
  await marcarNotificacoesLidas(user.id);
}

// --- Custos fixos ---

export async function createCustoFixoAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const nome = String(formData.get("nome") ?? "").trim();
  const regiao = String(formData.get("regiao") ?? "") as Regiao;
  const valor = Number(formData.get("valor") ?? 0);
  const dataVencimento = String(formData.get("dataVencimento") ?? "");
  const observacao = String(formData.get("observacao") ?? "").trim();
  const recorrente = formData.get("recorrente") === "on";
  const diaRecorrenciaRaw = Number(formData.get("diaRecorrencia") ?? 0);
  const diaRecorrencia =
    recorrente && diaRecorrenciaRaw >= 1 && diaRecorrenciaRaw <= 31 ? diaRecorrenciaRaw : null;

  if (!nome || !dataVencimento || valor <= 0 || !REGIOES.includes(regiao)) {
    return { error: "Preencha todos os campos corretamente." };
  }
  if (recorrente && !diaRecorrencia) {
    return { error: "Informe um dia de recorrência válido (1 a 31)." };
  }

  await createCustoFixo({
    nome,
    regiao,
    valor,
    dataVencimento,
    observacao,
    recorrente,
    diaRecorrencia,
    createdBy: user.id,
  });

  if (recorrente && diaRecorrencia) {
    const [anoStr, mesStr] = dataVencimento.split("-");
    const ano = Number(anoStr);
    const mesInicial = Number(mesStr);
    const proximosMeses: {
      nome: string;
      regiao: Regiao;
      valor: number;
      dataVencimento: string;
      observacao: string;
      recorrente: boolean;
      diaRecorrencia: number | null;
      createdBy: string;
    }[] = [];
    for (let mes = mesInicial + 1; mes <= 12; mes++) {
      const dia = Math.min(diaRecorrencia, ultimoDiaDoMes(ano, mes));
      proximosMeses.push({
        nome,
        regiao,
        valor,
        dataVencimento: `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`,
        observacao,
        recorrente,
        diaRecorrencia,
        createdBy: user.id,
      });
    }
    if (proximosMeses.length > 0) await createCustosFixosBulk(proximosMeses);
  }

  revalidatePath("/custos-fixos");
  return {};
}

export async function updateCustoFixoStatusAction(id: string, status: CustoFixoStatus) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!CUSTO_FIXO_STATUS.some((s) => s.id === status)) return;

  await updateCustoFixoStatus(id, status);
  revalidatePath("/custos-fixos");
}

export async function updateCustoFixoAction(
  id: string,
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const nome = String(formData.get("nome") ?? "").trim();
  const regiao = String(formData.get("regiao") ?? "") as Regiao;
  const valor = Number(formData.get("valor") ?? 0);
  const dataVencimento = String(formData.get("dataVencimento") ?? "");
  const observacao = String(formData.get("observacao") ?? "").trim();
  const recorrente = formData.get("recorrente") === "on";
  const diaRecorrenciaRaw = Number(formData.get("diaRecorrencia") ?? 0);
  const diaRecorrencia =
    recorrente && diaRecorrenciaRaw >= 1 && diaRecorrenciaRaw <= 31 ? diaRecorrenciaRaw : null;

  if (!nome || !dataVencimento || valor <= 0 || !REGIOES.includes(regiao)) {
    return { error: "Preencha todos os campos corretamente." };
  }
  if (recorrente && !diaRecorrencia) {
    return { error: "Informe um dia de recorrência válido (1 a 31)." };
  }

  await updateCustoFixo(id, {
    nome,
    regiao,
    valor,
    dataVencimento,
    observacao,
    recorrente,
    diaRecorrencia,
  });

  revalidatePath("/custos-fixos");
  return {};
}

export async function deleteCustoFixoAction(id: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  await deleteCustoFixo(id);
  revalidatePath("/custos-fixos");
}

function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate();
}

export async function replicarCustosFixosAction(
  itens: {
    nome: string;
    regiao: Regiao;
    valor: number;
    observacao: string;
    recorrente: boolean;
    diaRecorrencia: number | null;
    dia: number;
    mesOrigem: number;
    anoOrigem: number;
  }[],
  meses: number[],
  anosAdicionais: number
): Promise<{ error?: string; criados?: number }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (itens.length === 0 || meses.length === 0) {
    return { error: "Selecione ao menos um custo e um mês de destino." };
  }

  const anos = Array.from({ length: anosAdicionais + 1 }, (_, i) => itens[0].anoOrigem + i);

  const novos: {
    nome: string;
    regiao: Regiao;
    valor: number;
    dataVencimento: string;
    observacao: string;
    recorrente: boolean;
    diaRecorrencia: number | null;
    createdBy: string;
  }[] = [];

  for (const item of itens) {
    for (const ano of anos) {
      for (const mes of meses) {
        if (ano === item.anoOrigem && mes === item.mesOrigem) continue;
        const dia = Math.min(item.dia, ultimoDiaDoMes(ano, mes));
        const mesStr = String(mes).padStart(2, "0");
        const diaStr = String(dia).padStart(2, "0");
        novos.push({
          nome: item.nome,
          regiao: item.regiao,
          valor: item.valor,
          dataVencimento: `${ano}-${mesStr}-${diaStr}`,
          observacao: item.observacao,
          recorrente: item.recorrente,
          diaRecorrencia: item.diaRecorrencia,
          createdBy: user.id,
        });
      }
    }
  }

  if (novos.length === 0) {
    return { error: "Nenhum destino válido — os meses escolhidos coincidem com a origem." };
  }

  const criados = await createCustosFixosBulk(novos);
  revalidatePath("/custos-fixos");
  revalidatePath("/financeiro");
  return { criados };
}

// --- Lembretes e notas ---

export async function createLembreteAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const titulo = String(formData.get("titulo") ?? "").trim();
  const conteudo = String(formData.get("conteudo") ?? "").trim();

  if (!titulo && !conteudo) {
    return { error: "Escreva um título ou conteúdo." };
  }

  await createLembrete({ userId: user.id, titulo, conteudo });
  revalidatePath("/lembretes");
  return {};
}

export async function updateLembreteAction(id: string, titulo: string, conteudo: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await updateLembrete(id, { titulo, conteudo });
  revalidatePath("/lembretes");
}

export async function deleteLembreteAction(id: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await deleteLembrete(id);
  revalidatePath("/lembretes");
}

// --- Relatório de obra ---

export async function createRelatorioObraAction(
  obraId: string,
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const data = String(formData.get("data") ?? "");
  const texto = String(formData.get("texto") ?? "").trim();
  if (!data || !texto) {
    return { error: "Preencha a data e o texto do relatório." };
  }

  await createRelatorioObra({ obraId, data, texto, createdBy: user.id });
  revalidatePath(`/obras/${obraId}`);
  return {};
}

export async function deleteRelatorioObraAction(obraId: string, id: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await deleteRelatorioObra(id);
  revalidatePath(`/obras/${obraId}`);
}

// --- Pagamentos (fluxo de caixa) ---

export async function createPagamentoAction(
  obraId: string,
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const descricao = String(formData.get("descricao") ?? "").trim();
  const valor = Number(formData.get("valor") ?? 0);
  const dataPrevista = String(formData.get("dataPrevista") ?? "");
  const arquivoId = String(formData.get("arquivoId") ?? "").trim() || null;
  const recebido = formData.get("recebido") === "on";

  if (!descricao || !dataPrevista || valor <= 0) {
    return { error: "Preencha descrição, valor e data corretamente." };
  }

  const pagamento = await createPagamento({
    obraId,
    descricao,
    valor,
    dataPrevista,
    arquivoId,
    createdBy: user.id,
  });
  if (recebido) await updatePagamentoRecebido(pagamento.id, true);

  revalidatePath(`/obras/${obraId}`);
  revalidatePath("/fluxo-caixa");
  return {};
}

export async function updatePagamentoRecebidoAction(
  obraId: string,
  id: string,
  recebido: boolean
) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await updatePagamentoRecebido(id, recebido);
  revalidatePath(`/obras/${obraId}`);
  revalidatePath("/fluxo-caixa");
}

export async function updatePagamentoDataAction(obraId: string, id: string, dataPrevista: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataPrevista)) return;
  await updatePagamentoData(id, dataPrevista);
  revalidatePath(`/obras/${obraId}`);
  revalidatePath("/fluxo-caixa");
}

export async function deletePagamentoAction(obraId: string, id: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await deletePagamento(id);
  revalidatePath(`/obras/${obraId}`);
  revalidatePath("/fluxo-caixa");
}

// --- Datas importantes ---

export async function createDataImportanteAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  await requireAdmin();

  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const data = String(formData.get("data") ?? "");
  const alertaDiasAntes = Number(formData.get("alertaDiasAntes") ?? 3);
  const recorrente = formData.get("recorrente") === "on";

  if (!titulo || !data) {
    return { error: "Preencha título e data." };
  }

  const user = await getCurrentUser();
  await createDataImportante({
    titulo,
    descricao,
    data,
    alertaDiasAntes: alertaDiasAntes >= 0 ? alertaDiasAntes : 3,
    recorrente,
    createdBy: user!.id,
  });

  revalidatePath("/datas-importantes");
  return {};
}

export async function deleteDataImportanteAction(id: string) {
  await requireAdmin();
  await deleteDataImportante(id);
  revalidatePath("/datas-importantes");
}

export async function testarEmailAction(): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireAdmin();
  const emails = (process.env.ALERTA_EMAIL ?? "yago@vekio.co")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const res = await enviarEmail({
    to: emails,
    subject: "Teste de alerta — Sistema Vekio",
    html: `<div style="font-family: sans-serif; color: #2b2b2b;">
      <h2 style="color:#424431;">Funcionou! ✅</h2>
      <p>Este é um e-mail de teste do Sistema Vekio, disparado por ${user.nome}.</p>
      <p>Os alertas de datas importantes serão enviados para <strong>${emails.join(", ")}</strong>.</p>
    </div>`,
  });
  if (!res.ok) return { error: res.error ?? "Falha ao enviar." };
  return { ok: true };
}

export async function lerNotaFiscalArmazenadaAction(
  caminhoArmazenado: string,
  mediaType: string
): Promise<{ ok: true; data: NotaExtraida } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: blob, error } = await supabase.storage
    .from(ARQUIVOS_BUCKET)
    .download(caminhoArmazenado);
  if (error || !blob) return { ok: false, error: "Não foi possível baixar a nota." };

  const buffer = Buffer.from(await blob.arrayBuffer());
  const base64 = buffer.toString("base64");
  const categorias = await listCategorias();
  return lerNotaFiscal(base64, mediaType, categorias.map((c) => c.nome));
}

export async function lerFluxoContratoAction(
  arquivoId: string
): Promise<{ ok: true; parcelas: ParcelaExtraida[] } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const arquivo = await getArquivo(arquivoId);
  if (!arquivo) return { ok: false, error: "Documento não encontrado." };

  const supportedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
  if (!supportedTypes.has(arquivo.mimeType)) {
    return { ok: false, error: "Envie o contrato como PDF, JPG, PNG ou WEBP para leitura automática." };
  }

  const supabase = await createClient();
  const { data: blob, error } = await supabase.storage
    .from(ARQUIVOS_BUCKET)
    .download(arquivo.caminhoArmazenado);
  if (error || !blob) return { ok: false, error: "Não foi possível baixar o documento." };

  const buffer = Buffer.from(await blob.arrayBuffer());
  const LIMITE_BYTES = 90 * 1024 * 1024;
  if (buffer.byteLength > LIMITE_BYTES) {
    return {
      ok: false,
      error: "Esse arquivo é grande demais para a IA ler automaticamente (limite de 90MB).",
    };
  }

  const resultado = await lerFluxoPagamentosContrato(buffer, arquivo.mimeType);
  if (!resultado.ok) return { ok: false, error: resultado.error };
  if (resultado.data.length === 0) {
    return { ok: false, error: "Não foi possível identificar um fluxo de pagamentos neste documento." };
  }
  return { ok: true, parcelas: resultado.data };
}

export async function criarParcelasContratoAction(
  obraId: string,
  arquivoId: string,
  parcelas: ParcelaExtraida[]
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const validas = parcelas.filter((p) => p.valor > 0 && p.data);
  if (validas.length === 0) {
    return { error: "Nenhuma parcela válida para adicionar (verifique valor e data)." };
  }

  await createPagamentos(
    validas.map((p) => ({
      obraId,
      descricao: p.descricao,
      valor: p.valor,
      dataPrevista: p.data!,
      arquivoId,
      createdBy: user.id,
    }))
  );

  revalidatePath(`/obras/${obraId}`);
  revalidatePath("/fluxo-caixa");
  return {};
}
