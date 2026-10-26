import { REGIOES } from "./types";
import { createClient } from "./supabase/server";
import type {
  AbaCliente,
  Arquivo,
  ArquivoCategoria,
  Categoria,
  CustoFixo,
  CustoFixoStatus,
  Etapa,
  DataImportante,
  EscopoEtapa,
  Lancamento,
  Lembrete,
  Obra,
  ObraAditivo,
  Orcamento,
  OrcamentoEscopo,
  Pagamento,
  OrcamentoItem,
  RelatorioObra,
  OrcamentoParametros,
  OrcamentoTipo,
  PipelineStatus,
  Regiao,
} from "./types";

/**
 * Camada de dados sobre o Supabase (Postgres + Storage). As funções abaixo
 * mantêm as mesmas assinaturas usadas por `lib/actions.ts` e pelas páginas,
 * então nada além deste arquivo (e do upload de arquivos em `actions.ts`)
 * precisa mudar quando o banco evoluir.
 */

export const ARQUIVOS_BUCKET = "arquivos";

// --- Categorias ---

export async function listCategorias(): Promise<Categoria[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("categorias").select("id, nome").order("ordem");
  return data ?? [];
}

// --- Obras ---

function mapObra(row: Record<string, unknown>): Obra {
  return {
    id: row.id as string,
    nome: row.nome as string,
    endereco: row.endereco as string,
    clienteNome: row.cliente_nome as string,
    regiao: row.regiao as Regiao,
    valorVenda: Number(row.valor_venda),
    valorAditivos: Number(row.valor_aditivos ?? 0),
    status: row.status as Obra["status"],
    pipelineStatus: (row.pipeline_status as PipelineStatus | null) ?? null,
    dataInicio: row.data_inicio as string,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
  };
}

export async function listObras(): Promise<Obra[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("obras")
    .select("*")
    .or("pipeline_status.is.null,pipeline_status.eq.efetivado")
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapObra);
}

// --- Pipeline de orçamentos (propostas) ---

export async function listOrcamentoPropostas(): Promise<Obra[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("obras")
    .select("*")
    .not("pipeline_status", "is", null)
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapObra);
}

export async function createOrcamentoProposta(input: {
  nome: string;
  clienteNome: string;
  regiao: Regiao;
  dataInicio: string;
  createdBy: string;
}): Promise<Obra> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("obras")
    .insert({
      nome: input.nome,
      endereco: "",
      cliente_nome: input.clienteNome,
      regiao: input.regiao,
      valor_venda: 0,
      valor_aditivos: 0,
      status: "planejamento",
      pipeline_status: "em_andamento",
      data_inicio: input.dataInicio,
      created_by: input.createdBy,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Erro ao criar proposta de orçamento");
  return mapObra(data);
}

// --- Acessos às obras (pra "Obras recentes" na página inicial) ---

function hojeSP() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export async function registrarAcessoObra(userId: string, obraId: string): Promise<void> {
  try {
    const supabase = await createClient();
    const dia = hojeSP();
    const { data: existente } = await supabase
      .from("obra_acessos")
      .select("vezes")
      .eq("user_id", userId)
      .eq("obra_id", obraId)
      .eq("dia", dia)
      .maybeSingle();
    if (existente) {
      await supabase
        .from("obra_acessos")
        .update({ vezes: Number(existente.vezes) + 1 })
        .eq("user_id", userId)
        .eq("obra_id", obraId)
        .eq("dia", dia);
    } else {
      await supabase.from("obra_acessos").insert({ user_id: userId, obra_id: obraId, dia, vezes: 1 });
    }
  } catch {
    // o histórico de acessos nunca pode atrapalhar a página
  }
}

// As obras que a pessoa mais acessou nos últimos 30 dias (empate: a mais recente).
export async function listarObrasRecentes(userId: string, limite = 4): Promise<Obra[]> {
  try {
    const supabase = await createClient();
    const desde = new Date(Date.now() - 30 * 86_400_000).toLocaleDateString("en-CA", {
      timeZone: "America/Sao_Paulo",
    });
    const { data: acessos } = await supabase
      .from("obra_acessos")
      .select("obra_id, dia, vezes")
      .eq("user_id", userId)
      .gte("dia", desde);

    const placar = new Map<string, { total: number; ultimo: string }>();
    for (const a of acessos ?? []) {
      const atual = placar.get(a.obra_id as string) ?? { total: 0, ultimo: "" };
      atual.total += Number(a.vezes);
      if ((a.dia as string) > atual.ultimo) atual.ultimo = a.dia as string;
      placar.set(a.obra_id as string, atual);
    }
    const ordenadas = Array.from(placar.entries())
      .sort((x, y) => y[1].total - x[1].total || y[1].ultimo.localeCompare(x[1].ultimo))
      .slice(0, limite)
      .map(([id]) => id);
    if (ordenadas.length === 0) return [];

    const { data: obras } = await supabase.from("obras").select("*").in("id", ordenadas);
    const porId = new Map((obras ?? []).map((o) => [o.id as string, mapObra(o)]));
    return ordenadas.map((id) => porId.get(id)).filter((o): o is Obra => !!o);
  } catch {
    return [];
  }
}

export async function updateObraPipelineStatus(
  id: string,
  pipelineStatus: PipelineStatus
): Promise<void> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = { pipeline_status: pipelineStatus };
  if (pipelineStatus === "efetivado") patch.status = "em_andamento";
  if (pipelineStatus === "em_andamento") patch.status = "planejamento";
  await supabase.from("obras").update(patch).eq("id", id);
}

export async function getObra(id: string): Promise<Obra | undefined> {
  const supabase = await createClient();
  const { data } = await supabase.from("obras").select("*").eq("id", id).maybeSingle();
  return data ? mapObra(data) : undefined;
}

export async function createObra(input: {
  nome: string;
  endereco: string;
  clienteNome: string;
  regiao: Regiao;
  valorVenda: number;
  valorAditivos?: number;
  dataInicio: string;
  createdBy: string;
}): Promise<Obra> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("obras")
    .insert({
      nome: input.nome,
      endereco: input.endereco,
      cliente_nome: input.clienteNome,
      regiao: input.regiao,
      valor_venda: input.valorVenda,
      valor_aditivos: input.valorAditivos ?? 0,
      status: "em_andamento",
      data_inicio: input.dataInicio,
      created_by: input.createdBy,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Erro ao criar obra");
  return mapObra(data);
}

export async function deleteObra(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("obras").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateObra(
  id: string,
  input: Partial<
    Pick<
      Obra,
      "valorVenda" | "valorAditivos" | "status" | "nome" | "endereco" | "clienteNome" | "regiao" | "dataInicio"
    >
  >
): Promise<void> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (input.valorVenda !== undefined) patch.valor_venda = input.valorVenda;
  if (input.valorAditivos !== undefined) patch.valor_aditivos = input.valorAditivos;
  if (input.status !== undefined) patch.status = input.status;
  if (input.nome !== undefined) patch.nome = input.nome;
  if (input.endereco !== undefined) patch.endereco = input.endereco;
  if (input.clienteNome !== undefined) patch.cliente_nome = input.clienteNome;
  if (input.regiao !== undefined) patch.regiao = input.regiao;
  if (input.dataInicio !== undefined) patch.data_inicio = input.dataInicio;
  if (Object.keys(patch).length === 0) return;
  await supabase.from("obras").update(patch).eq("id", id);
}

// --- Aditivos por obra ---

function mapObraAditivo(row: Record<string, unknown>): ObraAditivo {
  return {
    id: row.id as string,
    obraId: row.obra_id as string,
    descricao: row.descricao as string,
    valor: Number(row.valor),
    data: row.data as string,
    arquivoId: (row.arquivo_id as string | null) ?? null,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
  };
}

async function recomputeObraAditivosTotal(obraId: string): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.from("obra_aditivos").select("valor").eq("obra_id", obraId);
  const total = (data ?? []).reduce((sum, r) => sum + Number(r.valor), 0);
  await supabase.from("obras").update({ valor_aditivos: total }).eq("id", obraId);
}

export async function listObraAditivos(obraId: string): Promise<ObraAditivo[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("obra_aditivos")
    .select("*")
    .eq("obra_id", obraId)
    .order("data", { ascending: false });
  return (data ?? []).map(mapObraAditivo);
}

export async function createObraAditivo(input: {
  obraId: string;
  descricao: string;
  valor: number;
  data: string;
  arquivoId?: string | null;
  createdBy: string;
}): Promise<ObraAditivo> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("obra_aditivos")
    .insert({
      obra_id: input.obraId,
      descricao: input.descricao,
      valor: input.valor,
      data: input.data,
      arquivo_id: input.arquivoId ?? null,
      created_by: input.createdBy,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Erro ao criar aditivo");
  await recomputeObraAditivosTotal(input.obraId);
  return mapObraAditivo(data);
}

export async function deleteObraAditivo(id: string, obraId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("obra_aditivos").delete().eq("id", id);
  await recomputeObraAditivosTotal(obraId);
}

// --- Lançamentos ---

function mapLancamento(row: Record<string, unknown>): Lancamento {
  return {
    id: row.id as string,
    obraId: row.obra_id as string,
    categoriaId: row.categoria_id as string,
    fornecedor: (row.fornecedor as string | null) ?? null,
    setor: (row.setor as string | null) ?? null,
    valor: Number(row.valor),
    descricao: row.descricao as string,
    data: row.data as string,
    lancadoPor: row.lancado_por as string,
    createdAt: row.created_at as string,
  };
}

export async function listLancamentos(obraId: string): Promise<Lancamento[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lancamentos")
    .select("*")
    .eq("obra_id", obraId)
    .order("data", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapLancamento);
}

export async function createLancamento(input: {
  obraId: string;
  categoriaId: string;
  fornecedor?: string | null;
  setor?: string | null;
  valor: number;
  descricao: string;
  data: string;
  lancadoPor: string;
}): Promise<Lancamento> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lancamentos")
    .insert({
      obra_id: input.obraId,
      categoria_id: input.categoriaId,
      fornecedor: input.fornecedor || null,
      setor: input.setor || null,
      valor: input.valor,
      descricao: input.descricao,
      data: input.data,
      lancado_por: input.lancadoPor,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Erro ao lançar gasto");
  return mapLancamento(data);
}

export async function updateLancamento(
  id: string,
  input: {
    categoriaId: string;
    fornecedor?: string | null;
    setor?: string | null;
    valor: number;
    descricao: string;
    data: string;
  }
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("lancamentos")
    .update({
      categoria_id: input.categoriaId,
      fornecedor: input.fornecedor || null,
      setor: input.setor || null,
      valor: input.valor,
      descricao: input.descricao,
      data: input.data,
    })
    .eq("id", id);
}

export async function deleteLancamento(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("lancamentos").delete().eq("id", id);
}

export type ObraTotais = {
  totalGasto: number;
  margem: number;
  percentualUsado: number;
  porCategoria: { categoriaId: string; categoriaNome: string; total: number }[];
};

export async function getObraTotais(obraId: string): Promise<ObraTotais> {
  const supabase = await createClient();
  const [{ data: obra }, { data: lancamentos }, { data: categorias }] = await Promise.all([
    supabase.from("obras").select("valor_venda, valor_aditivos").eq("id", obraId).maybeSingle(),
    supabase.from("lancamentos").select("categoria_id, valor").eq("obra_id", obraId),
    supabase.from("categorias").select("id, nome"),
  ]);

  const totalGasto = (lancamentos ?? []).reduce((sum, l) => sum + Number(l.valor), 0);
  const valorVenda = Number(obra?.valor_venda ?? 0);
  const valorAditivos = Number(obra?.valor_aditivos ?? 0);

  const porCategoriaMap = new Map<string, number>();
  for (const l of lancamentos ?? []) {
    porCategoriaMap.set(l.categoria_id, (porCategoriaMap.get(l.categoria_id) ?? 0) + Number(l.valor));
  }
  const porCategoria = Array.from(porCategoriaMap.entries()).map(([categoriaId, total]) => ({
    categoriaId,
    categoriaNome: categorias?.find((c) => c.id === categoriaId)?.nome ?? "Outros",
    total,
  }));

  return {
    totalGasto,
    margem: valorVenda + valorAditivos - totalGasto,
    percentualUsado: valorVenda > 0 ? (totalGasto / valorVenda) * 100 : 0,
    porCategoria,
  };
}

// --- Etapas (cronograma) ---

// Progresso é sempre calculado a partir do período decorrido entre
// dataInicio e dataFim (não é um valor manual) — uma etapa que ainda não
// começou é 0%, uma já concluída no calendário é 100%, e o meio do caminho
// é proporcional aos dias corridos até hoje.
function calcularProgresso(dataInicio: string, dataFim: string): number {
  const inicio = new Date(dataInicio + "T00:00:00").getTime();
  const fim = new Date(dataFim + "T00:00:00").getTime();
  const hoje = Date.now();
  if (hoje <= inicio) return 0;
  if (hoje >= fim) return 100;
  if (fim <= inicio) return 100;
  return Math.round(((hoje - inicio) / (fim - inicio)) * 100);
}

function mapEtapa(row: Record<string, unknown>): Etapa {
  const dataInicio = row.data_inicio as string;
  const dataFim = row.data_fim as string;
  return {
    id: row.id as string,
    obraId: row.obra_id as string,
    nome: row.nome as string,
    dataInicio,
    dataFim,
    progresso: calcularProgresso(dataInicio, dataFim),
    ordem: Number(row.ordem),
    createdAt: row.created_at as string,
  };
}

export async function listEtapas(obraId: string): Promise<Etapa[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("etapas").select("*").eq("obra_id", obraId).order("ordem");
  return (data ?? []).map(mapEtapa);
}

export async function createEtapa(input: {
  obraId: string;
  nome: string;
  dataInicio: string;
  dataFim: string;
}): Promise<Etapa> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("etapas")
    .select("*", { count: "exact", head: true })
    .eq("obra_id", input.obraId);

  const { data, error } = await supabase
    .from("etapas")
    .insert({
      obra_id: input.obraId,
      nome: input.nome,
      data_inicio: input.dataInicio,
      data_fim: input.dataFim,
      progresso: 0,
      ordem: count ?? 0,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Erro ao criar etapa");
  return mapEtapa(data);
}

export async function updateEtapa(
  id: string,
  input: { nome: string; dataInicio: string; dataFim: string }
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("etapas")
    .update({ nome: input.nome, data_inicio: input.dataInicio, data_fim: input.dataFim })
    .eq("id", id);
}

export async function deleteEtapa(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("etapas").delete().eq("id", id);
}

// --- Arquivos (documentos) ---

function mapArquivo(row: Record<string, unknown>): Arquivo {
  return {
    id: row.id as string,
    obraId: row.obra_id as string,
    categoria: row.categoria as ArquivoCategoria,
    nomeOriginal: row.nome_original as string,
    caminhoArmazenado: row.caminho_armazenado as string,
    tamanhoBytes: Number(row.tamanho_bytes),
    mimeType: row.mime_type as string,
    enviadoPor: row.enviado_por as string,
    visivelCliente: Boolean(row.visivel_cliente),
    legenda: (row.legenda as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function listArquivos(obraId: string): Promise<Arquivo[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("arquivos")
    .select("*")
    .eq("obra_id", obraId)
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapArquivo);
}

export async function getArquivo(id: string): Promise<Arquivo | undefined> {
  const supabase = await createClient();
  const { data } = await supabase.from("arquivos").select("*").eq("id", id).maybeSingle();
  return data ? mapArquivo(data) : undefined;
}

export type ClienteAcesso = {
  clienteId: string;
  nome: string;
  email: string;
  createdAt: string;
  abasVisiveis: AbaCliente[];
};

const TODAS_ABAS: AbaCliente[] = ["cronograma", "diario", "fotos", "documentos"];

export async function listClientesDaObra(obraId: string): Promise<ClienteAcesso[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cliente_obras")
    .select("cliente_id, created_at, abas_visiveis, profiles(nome, email)")
    .eq("obra_id", obraId)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as {
    cliente_id: string;
    created_at: string;
    abas_visiveis: AbaCliente[] | null;
    profiles: { nome: string; email: string } | null;
  }[];
  return rows.map((r) => ({
    clienteId: r.cliente_id,
    nome: r.profiles?.nome ?? "",
    email: r.profiles?.email ?? "",
    createdAt: r.created_at,
    abasVisiveis: r.abas_visiveis ?? TODAS_ABAS,
  }));
}

export async function updateAbasVisiveisCliente(
  clienteId: string,
  obraId: string,
  abas: AbaCliente[]
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("cliente_obras")
    .update({ abas_visiveis: abas })
    .eq("cliente_id", clienteId)
    .eq("obra_id", obraId);
}

export async function listObrasDoCliente(clienteId: string): Promise<Obra[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cliente_obras")
    .select("obras(*)")
    .eq("cliente_id", clienteId);
  const rows = (data ?? []) as unknown as { obras: Record<string, unknown> | null }[];
  return rows.filter((r) => r.obras).map((r) => mapObra(r.obras as Record<string, unknown>));
}

export type ClienteAcessoGlobal = {
  clienteId: string;
  nome: string;
  email: string;
  obraId: string;
  obraNome: string;
  regiao: Regiao;
  createdAt: string;
  abasVisiveis: AbaCliente[];
};

export async function listTodosClientesComAcesso(): Promise<ClienteAcessoGlobal[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cliente_obras")
    .select("cliente_id, obra_id, created_at, abas_visiveis, profiles(nome, email), obras(nome, regiao)")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as {
    cliente_id: string;
    obra_id: string;
    created_at: string;
    abas_visiveis: AbaCliente[] | null;
    profiles: { nome: string; email: string } | null;
    obras: { nome: string; regiao: Regiao } | null;
  }[];
  return rows
    .filter((r) => r.profiles && r.obras)
    .map((r) => ({
      clienteId: r.cliente_id,
      nome: r.profiles!.nome,
      email: r.profiles!.email,
      obraId: r.obra_id,
      obraNome: r.obras!.nome,
      regiao: r.obras!.regiao,
      createdAt: r.created_at,
      abasVisiveis: r.abas_visiveis ?? TODAS_ABAS,
    }));
}

export async function createArquivo(input: {
  obraId: string;
  categoria: ArquivoCategoria;
  nomeOriginal: string;
  caminhoArmazenado: string;
  tamanhoBytes: number;
  mimeType: string;
  enviadoPor: string;
  legenda?: string | null;
}): Promise<Arquivo> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("arquivos")
    .insert({
      obra_id: input.obraId,
      categoria: input.categoria,
      nome_original: input.nomeOriginal,
      caminho_armazenado: input.caminhoArmazenado,
      tamanho_bytes: input.tamanhoBytes,
      mime_type: input.mimeType,
      enviado_por: input.enviadoPor,
      legenda: input.legenda || null,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Erro ao registrar arquivo");
  return mapArquivo(data);
}

export async function deleteArquivo(id: string): Promise<Arquivo | undefined> {
  const supabase = await createClient();
  const arquivo = await getArquivo(id);
  await supabase.from("arquivos").delete().eq("id", id);
  return arquivo;
}

export async function updateArquivoCategoria(id: string, categoria: ArquivoCategoria): Promise<void> {
  const supabase = await createClient();
  await supabase.from("arquivos").update({ categoria }).eq("id", id);
}

export async function updateArquivoVisibilidade(id: string, visivelCliente: boolean): Promise<void> {
  const supabase = await createClient();
  await supabase.from("arquivos").update({ visivel_cliente: visivelCliente }).eq("id", id);
}

// --- Financeiro global ---

export type FinanceiroAno = {
  faturamentoTotal: number;
  totalGastoGeral: number;
  custoFixoTotal: number;
  margemTotal: number;
  margemPercentualMedia: number;
  aditivosTotal: number;
  totalObras: number;
  obrasAtivas: number;
  porRegiao: {
    regiao: Regiao;
    totalObras: number;
    faturamento: number;
    aditivos: number;
    gasto: number;
    margem: number;
  }[];
  porCategoria: { categoriaId: string; categoriaNome: string; total: number }[];
  porMes: { mes: string; faturamento: number; gasto: number }[];
  rankingObras: {
    obraId: string;
    obraNome: string;
    regiao: Regiao;
    valorVenda: number;
    valorAditivos: number;
    totalGasto: number;
    margem: number;
    margemPercentual: number;
  }[];
};

export type FinanceiroGlobal = {
  anos: string[];
  geral: Record<string, FinanceiroAno>;
  porRegiaoAno: Record<Regiao, Record<string, FinanceiroAno>>;
};

function mesLabel(iso: string) {
  const d = new Date(iso + (iso.length === 7 ? "-01" : ""));
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
}

function computeFinanceiroAno(
  obras: Obra[],
  lancamentos: { obraId: string; categoriaId: string; valor: number; data: string }[],
  categorias: { id: string; nome: string }[],
  custosFixos: { valor: number }[]
): FinanceiroAno {
  const faturamentoTotal = obras.reduce((sum, o) => sum + o.valorVenda, 0);
  const aditivosTotal = obras.reduce((sum, o) => sum + o.valorAditivos, 0);
  const totalGastoGeral = lancamentos.reduce((sum, l) => sum + l.valor, 0);
  const custoFixoTotal = custosFixos.reduce((sum, c) => sum + c.valor, 0);
  const margemTotal = faturamentoTotal + aditivosTotal - totalGastoGeral - custoFixoTotal;

  const gastoPorObra = new Map<string, number>();
  for (const l of lancamentos) {
    gastoPorObra.set(l.obraId, (gastoPorObra.get(l.obraId) ?? 0) + l.valor);
  }

  const rankingObras = obras
    .map((o) => {
      const totalGasto = gastoPorObra.get(o.id) ?? 0;
      const receitaTotal = o.valorVenda + o.valorAditivos;
      const margem = receitaTotal - totalGasto;
      return {
        obraId: o.id,
        obraNome: o.nome,
        regiao: o.regiao,
        valorVenda: o.valorVenda,
        valorAditivos: o.valorAditivos,
        totalGasto,
        margem,
        margemPercentual: receitaTotal > 0 ? (margem / receitaTotal) * 100 : 0,
      };
    })
    .sort((a, b) => b.margem - a.margem);

  const margemPercentualMedia =
    obras.length > 0
      ? rankingObras.reduce((sum, r) => sum + r.margemPercentual, 0) / obras.length
      : 0;

  const porRegiaoMap = new Map<
    Regiao,
    { totalObras: number; faturamento: number; aditivos: number; gasto: number }
  >();
  for (const regiao of REGIOES) {
    porRegiaoMap.set(regiao, { totalObras: 0, faturamento: 0, aditivos: 0, gasto: 0 });
  }
  for (const o of obras) {
    const entry = porRegiaoMap.get(o.regiao)!;
    entry.totalObras += 1;
    entry.faturamento += o.valorVenda;
    entry.aditivos += o.valorAditivos;
    entry.gasto += gastoPorObra.get(o.id) ?? 0;
  }
  const porRegiao = REGIOES.map((regiao) => {
    const entry = porRegiaoMap.get(regiao)!;
    return { regiao, ...entry, margem: entry.faturamento + entry.aditivos - entry.gasto };
  });

  const porCategoriaMap = new Map<string, number>();
  for (const l of lancamentos) {
    porCategoriaMap.set(l.categoriaId, (porCategoriaMap.get(l.categoriaId) ?? 0) + l.valor);
  }
  const porCategoria = Array.from(porCategoriaMap.entries()).map(([categoriaId, total]) => ({
    categoriaId,
    categoriaNome: categorias?.find((c) => c.id === categoriaId)?.nome ?? "Outros",
    total,
  }));

  const mesesMap = new Map<string, { faturamento: number; gasto: number }>();
  const ensureMes = (mesKey: string) => {
    if (!mesesMap.has(mesKey)) mesesMap.set(mesKey, { faturamento: 0, gasto: 0 });
    return mesesMap.get(mesKey)!;
  };
  for (const o of obras) {
    ensureMes(o.dataInicio.slice(0, 7)).faturamento += o.valorVenda;
  }
  for (const l of lancamentos) {
    ensureMes(l.data.slice(0, 7)).gasto += l.valor;
  }
  const porMes = Array.from(mesesMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mesKey, v]) => ({ mes: mesLabel(mesKey), ...v }));

  return {
    faturamentoTotal,
    totalGastoGeral,
    custoFixoTotal,
    margemTotal,
    margemPercentualMedia,
    aditivosTotal,
    totalObras: obras.length,
    obrasAtivas: obras.filter((o) => o.status === "em_andamento").length,
    porRegiao,
    porCategoria,
    porMes,
    rankingObras,
  };
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function fetchAllRows(
  supabase: SupabaseClient,
  table: string,
  columns: string
): Promise<Record<string, unknown>[]> {
  const PAGE = 1000;
  let all: Record<string, unknown>[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    all = all.concat(rows);
    if (!data || rows.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

export async function getFinanceiroGlobal(): Promise<FinanceiroGlobal> {
  const supabase = await createClient();
  const [obrasRows, lancamentosRows, categorias, custosRows] = await Promise.all([
    fetchAllRows(supabase, "obras", "*"),
    fetchAllRows(supabase, "lancamentos", "obra_id, categoria_id, valor, data"),
    fetchAllRows(supabase, "categorias", "id, nome") as Promise<{ id: string; nome: string }[]>,
    fetchAllRows(supabase, "custos_fixos", "regiao, valor, data_vencimento"),
  ]);

  const obras = (obrasRows ?? [])
    .map(mapObra)
    .filter((o) => o.pipelineStatus === null || o.pipelineStatus === "efetivado");
  const obraIds = new Set(obras.map((o) => o.id));
  const lancamentos = (lancamentosRows ?? [])
    .filter((l) => obraIds.has(l.obra_id as string))
    .map((l) => ({
      obraId: l.obra_id as string,
      categoriaId: l.categoria_id as string,
      valor: Number(l.valor),
      data: l.data as string,
    }));
  const custos = (custosRows ?? []).map((c) => ({
    regiao: c.regiao as Regiao,
    valor: Number(c.valor),
    ano: String(c.data_vencimento).slice(0, 4),
  }));
  const categoriasList = categorias ?? [];

  const anos = Array.from(new Set(obras.map((o) => o.dataInicio.slice(0, 4)))).sort(
    (a, b) => Number(b) - Number(a)
  );
  const todosOsAnos = ["todos", ...anos];

  const geral: Record<string, FinanceiroAno> = {
    todos: computeFinanceiroAno(obras, lancamentos, categoriasList, custos),
  };
  for (const ano of anos) {
    const obrasDoAno = obras.filter((o) => o.dataInicio.slice(0, 4) === ano);
    const idsDoAno = new Set(obrasDoAno.map((o) => o.id));
    const lancamentosDoAno = lancamentos.filter((l) => idsDoAno.has(l.obraId));
    const custosDoAno = custos.filter((c) => c.ano === ano);
    geral[ano] = computeFinanceiroAno(obrasDoAno, lancamentosDoAno, categoriasList, custosDoAno);
  }

  const porRegiaoAno = {} as Record<Regiao, Record<string, FinanceiroAno>>;
  for (const regiao of REGIOES) {
    const obrasDaRegiao = obras.filter((o) => o.regiao === regiao);
    const idsDaRegiao = new Set(obrasDaRegiao.map((o) => o.id));
    const lancamentosDaRegiao = lancamentos.filter((l) => idsDaRegiao.has(l.obraId));
    const custosDaRegiao = custos.filter((c) => c.regiao === regiao);

    const porAno: Record<string, FinanceiroAno> = {
      todos: computeFinanceiroAno(obrasDaRegiao, lancamentosDaRegiao, categoriasList, custosDaRegiao),
    };
    for (const ano of anos) {
      const obrasDoAno = obrasDaRegiao.filter((o) => o.dataInicio.slice(0, 4) === ano);
      const idsDoAno = new Set(obrasDoAno.map((o) => o.id));
      const lancamentosDoAno = lancamentosDaRegiao.filter((l) => idsDoAno.has(l.obraId));
      const custosDoAno = custosDaRegiao.filter((c) => c.ano === ano);
      porAno[ano] = computeFinanceiroAno(obrasDoAno, lancamentosDoAno, categoriasList, custosDoAno);
    }
    porRegiaoAno[regiao] = porAno;
  }

  return { anos: todosOsAnos, geral, porRegiaoAno };
}

// --- Orçamentos (planilhas nomeadas) ---

function mapOrcamento(row: Record<string, unknown>): Orcamento {
  return {
    id: row.id as string,
    obraId: row.obra_id as string,
    nome: row.nome as string,
    ordem: Number(row.ordem),
    createdAt: row.created_at as string,
  };
}

export async function listOrcamentos(obraId: string): Promise<Orcamento[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orcamentos")
    .select("*")
    .eq("obra_id", obraId)
    .order("ordem");
  return (data ?? []).map(mapOrcamento);
}

export async function createOrcamento(obraId: string, nome: string): Promise<Orcamento> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("orcamentos")
    .select("*", { count: "exact", head: true })
    .eq("obra_id", obraId);

  const { data, error } = await supabase
    .from("orcamentos")
    .insert({ obra_id: obraId, nome, ordem: count ?? 0 })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Erro ao criar planilha de orçamento");
  return mapOrcamento(data);
}

export async function renameOrcamento(id: string, nome: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("orcamentos").update({ nome }).eq("id", id);
}

export async function deleteOrcamento(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("orcamentos").delete().eq("id", id);
}

// --- Itens de orçamento ---

function mapOrcamentoItem(row: Record<string, unknown>): OrcamentoItem {
  return {
    id: row.id as string,
    orcamentoId: row.orcamento_id as string,
    tipo: row.tipo as OrcamentoTipo,
    etapa: row.etapa as string,
    descricao: row.descricao as string,
    valorUnitario: Number(row.valor_unitario),
    quantidade: Number(row.quantidade),
    unidade: row.unidade as string,
    valorTotal: Number(row.valor_total),
    observacao: row.observacao as string,
    negrito: Boolean(row.negrito),
    cor: (row.cor as string | null) ?? null,
    ordem: Number(row.ordem),
    createdAt: row.created_at as string,
  };
}

export async function listOrcamentoItens(orcamentoId: string): Promise<OrcamentoItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orcamento_itens")
    .select("*")
    .eq("orcamento_id", orcamentoId)
    .order("ordem");
  return (data ?? []).map(mapOrcamentoItem);
}

export async function getOrcamentoItem(id: string): Promise<OrcamentoItem | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("orcamento_itens").select("*").eq("id", id).maybeSingle();
  return data ? mapOrcamentoItem(data) : null;
}

export async function createOrcamentoItem(input: {
  orcamentoId: string;
  tipo: OrcamentoTipo;
  etapa: string;
  descricao: string;
  valorUnitario: number;
  quantidade: number;
  unidade: string;
  valorTotal: number;
  observacao: string;
}): Promise<OrcamentoItem> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("orcamento_itens")
    .select("*", { count: "exact", head: true })
    .eq("orcamento_id", input.orcamentoId);

  const { data, error } = await supabase
    .from("orcamento_itens")
    .insert({
      orcamento_id: input.orcamentoId,
      tipo: input.tipo,
      etapa: input.etapa,
      descricao: input.descricao,
      valor_unitario: input.valorUnitario,
      quantidade: input.quantidade,
      unidade: input.unidade,
      valor_total: input.valorTotal,
      observacao: input.observacao,
      ordem: count ?? 0,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Erro ao adicionar item de orçamento");
  return mapOrcamentoItem(data);
}

export async function createOrcamentoItens(
  orcamentoId: string,
  itens: (Omit<OrcamentoItem, "id" | "orcamentoId" | "ordem" | "createdAt" | "negrito" | "cor"> & {
    negrito?: boolean;
    cor?: string | null;
  })[]
): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("orcamento_itens")
    .select("*", { count: "exact", head: true })
    .eq("orcamento_id", orcamentoId);

  let ordem = count ?? 0;
  const rows = itens.map((item) => ({
    orcamento_id: orcamentoId,
    tipo: item.tipo,
    etapa: item.etapa,
    descricao: item.descricao,
    valor_unitario: item.valorUnitario,
    quantidade: item.quantidade,
    unidade: item.unidade,
    valor_total: item.valorTotal,
    observacao: item.observacao,
    negrito: item.negrito ?? false,
    cor: item.cor ?? null,
    ordem: ordem++,
  }));

  const { error } = await supabase.from("orcamento_itens").insert(rows);
  if (error) throw new Error(error.message);
  return itens.length;
}

export async function updateOrcamentoItem(
  id: string,
  input: Partial<Pick<OrcamentoItem, "descricao" | "etapa" | "valorUnitario" | "quantidade" | "unidade" | "valorTotal" | "observacao" | "negrito" | "cor">>
): Promise<void> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (input.descricao !== undefined) patch.descricao = input.descricao;
  if (input.etapa !== undefined) patch.etapa = input.etapa;
  if (input.valorUnitario !== undefined) patch.valor_unitario = input.valorUnitario;
  if (input.quantidade !== undefined) patch.quantidade = input.quantidade;
  if (input.unidade !== undefined) patch.unidade = input.unidade;
  if (input.valorTotal !== undefined) patch.valor_total = input.valorTotal;
  if (input.observacao !== undefined) patch.observacao = input.observacao;
  if (input.negrito !== undefined) patch.negrito = input.negrito;
  if (input.cor !== undefined) patch.cor = input.cor;
  if (Object.keys(patch).length === 0) return;
  await supabase.from("orcamento_itens").update(patch).eq("id", id);
}

export async function deleteOrcamentoItem(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("orcamento_itens").delete().eq("id", id);
}

export async function clearOrcamento(orcamentoId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("orcamento_itens").delete().eq("orcamento_id", orcamentoId);
}

// --- Parâmetros de precificação do orçamento ---

const PARAMETROS_PADRAO = { margemVekio: 0, rt: 0, imposto: 0, lucratividadeEsperada: 0 };

function mapParametros(row: Record<string, unknown>): OrcamentoParametros {
  return {
    orcamentoId: row.orcamento_id as string,
    margemVekio: Number(row.margem_vekio),
    rt: Number(row.rt),
    imposto: Number(row.imposto),
    lucratividadeEsperada: Number(row.lucratividade_esperada),
    updatedAt: row.updated_at as string,
  };
}

export async function getOrcamentoParametros(orcamentoId: string): Promise<OrcamentoParametros> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orcamento_parametros")
    .select("*")
    .eq("orcamento_id", orcamentoId)
    .maybeSingle();
  if (data) return mapParametros(data);
  return { orcamentoId, ...PARAMETROS_PADRAO, updatedAt: new Date().toISOString() };
}

export async function upsertOrcamentoParametros(
  orcamentoId: string,
  input: Partial<Omit<OrcamentoParametros, "orcamentoId" | "updatedAt">>
): Promise<OrcamentoParametros> {
  const supabase = await createClient();
  const existente = await getOrcamentoParametros(orcamentoId);

  const row = {
    orcamento_id: orcamentoId,
    margem_vekio: input.margemVekio ?? existente.margemVekio,
    rt: input.rt ?? existente.rt,
    imposto: input.imposto ?? existente.imposto,
    lucratividade_esperada: input.lucratividadeEsperada ?? existente.lucratividadeEsperada,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("orcamento_parametros")
    .upsert(row, { onConflict: "orcamento_id" })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Erro ao salvar parâmetros");
  return mapParametros(data);
}

function mapOrcamentoEscopo(row: Record<string, unknown>): OrcamentoEscopo {
  const conteudo = row.conteudo as {
    etapas?: EscopoEtapa[];
    prazoEstimado?: string | null;
    condicoes?: string;
    valorObra?: number;
    tributacao?: number;
    totalComTributacao?: number;
  };
  return {
    orcamentoId: row.orcamento_id as string,
    etapas: conteudo.etapas ?? [],
    prazoEstimado: conteudo.prazoEstimado ?? null,
    condicoes: conteudo.condicoes ?? "",
    valorObra: conteudo.valorObra ?? 0,
    tributacao: conteudo.tributacao ?? 0,
    totalComTributacao: conteudo.totalComTributacao ?? 0,
    geradoPor: (row.gerado_por as string) ?? "",
    geradoEm: row.gerado_em as string,
  };
}

export async function getOrcamentoEscopo(orcamentoId: string): Promise<OrcamentoEscopo | undefined> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orcamento_escopos")
    .select("*")
    .eq("orcamento_id", orcamentoId)
    .maybeSingle();
  return data ? mapOrcamentoEscopo(data) : undefined;
}

export async function upsertOrcamentoEscopo(
  orcamentoId: string,
  conteudo: {
    etapas: EscopoEtapa[];
    prazoEstimado: string | null;
    condicoes: string;
    valorObra: number;
    tributacao: number;
    totalComTributacao: number;
  },
  geradoPor: string
): Promise<OrcamentoEscopo> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orcamento_escopos")
    .upsert(
      { orcamento_id: orcamentoId, conteudo, gerado_por: geradoPor, gerado_em: new Date().toISOString() },
      { onConflict: "orcamento_id" }
    )
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Erro ao salvar escopo");
  return mapOrcamentoEscopo(data);
}

export async function updateOrcamentoEscopoConteudo(
  orcamentoId: string,
  conteudo: {
    etapas: EscopoEtapa[];
    prazoEstimado: string | null;
    condicoes: string;
    valorObra: number;
    tributacao: number;
    totalComTributacao: number;
  }
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("orcamento_escopos")
    .update({ conteudo })
    .eq("orcamento_id", orcamentoId);
  if (error) throw new Error(error.message);
}

export type Precificacao = {
  custoDaObra: number;
  baseCalculo: number;
  valorVenda: number;
  rtValor: number;
  impostoValor: number;
  margemReal: number;
  margemRealPercentual: number;
  aproximacaoMeta: number;
};

export function calcularPrecificacao(
  custoDaObra: number,
  params: Pick<OrcamentoParametros, "margemVekio" | "rt" | "imposto" | "lucratividadeEsperada">
): Precificacao {
  const baseCalculo = custoDaObra * (1 + params.margemVekio / 100);
  const divisor = 1 - params.rt / 100 - params.imposto / 100;
  const valorVenda = divisor > 0 ? baseCalculo / divisor : 0;
  const rtValor = valorVenda * (params.rt / 100);
  const impostoValor = valorVenda * (params.imposto / 100);
  const margemReal = valorVenda - custoDaObra - rtValor - impostoValor;
  const margemRealPercentual = valorVenda > 0 ? (margemReal / valorVenda) * 100 : 0;
  const aproximacaoMeta = margemRealPercentual - params.lucratividadeEsperada;

  return {
    custoDaObra,
    baseCalculo,
    valorVenda,
    rtValor,
    impostoValor,
    margemReal,
    margemRealPercentual,
    aproximacaoMeta,
  };
}

// --- Custos fixos ---

function mapCustoFixo(row: Record<string, unknown>): CustoFixo {
  return {
    id: row.id as string,
    nome: row.nome as string,
    regiao: row.regiao as Regiao,
    valor: Number(row.valor),
    dataVencimento: row.data_vencimento as string,
    status: row.status as CustoFixoStatus,
    observacao: row.observacao as string,
    recorrente: Boolean(row.recorrente),
    diaRecorrencia: row.dia_recorrencia != null ? Number(row.dia_recorrencia) : null,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
  };
}

export async function listCustosFixos(): Promise<CustoFixo[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("custos_fixos")
    .select("*")
    .order("data_vencimento", { ascending: true });
  return (data ?? []).map(mapCustoFixo);
}

export async function createCustoFixo(input: {
  nome: string;
  regiao: Regiao;
  valor: number;
  dataVencimento: string;
  observacao?: string;
  recorrente?: boolean;
  diaRecorrencia?: number | null;
  createdBy: string;
}): Promise<CustoFixo> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("custos_fixos")
    .insert({
      nome: input.nome,
      regiao: input.regiao,
      valor: input.valor,
      data_vencimento: input.dataVencimento,
      observacao: input.observacao ?? "",
      status: "pendente",
      recorrente: input.recorrente ?? false,
      dia_recorrencia: input.recorrente ? input.diaRecorrencia ?? null : null,
      created_by: input.createdBy,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Erro ao criar custo fixo");
  return mapCustoFixo(data);
}

export async function createCustosFixosBulk(
  itens: {
    nome: string;
    regiao: Regiao;
    valor: number;
    dataVencimento: string;
    observacao?: string;
    recorrente?: boolean;
    diaRecorrencia?: number | null;
    createdBy: string;
  }[]
): Promise<number> {
  if (itens.length === 0) return 0;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("custos_fixos")
    .insert(
      itens.map((input) => ({
        nome: input.nome,
        regiao: input.regiao,
        valor: input.valor,
        data_vencimento: input.dataVencimento,
        observacao: input.observacao ?? "",
        status: "pendente",
        recorrente: input.recorrente ?? false,
        dia_recorrencia: input.recorrente ? input.diaRecorrencia ?? null : null,
        created_by: input.createdBy,
      }))
    )
    .select();
  if (error) throw new Error(error.message ?? "Erro ao replicar custos fixos");
  return data?.length ?? 0;
}

export async function updateCustoFixoStatus(id: string, status: CustoFixoStatus): Promise<void> {
  const supabase = await createClient();
  await supabase.from("custos_fixos").update({ status }).eq("id", id);
}

export async function updateCustoFixo(
  id: string,
  input: {
    nome: string;
    regiao: Regiao;
    valor: number;
    dataVencimento: string;
    observacao: string;
    recorrente: boolean;
    diaRecorrencia: number | null;
  }
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("custos_fixos")
    .update({
      nome: input.nome,
      regiao: input.regiao,
      valor: input.valor,
      data_vencimento: input.dataVencimento,
      observacao: input.observacao,
      recorrente: input.recorrente,
      dia_recorrencia: input.recorrente ? input.diaRecorrencia : null,
    })
    .eq("id", id);
}

export async function deleteCustoFixo(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("custos_fixos").delete().eq("id", id);
}

// --- Lembretes e notas ---

function mapLembrete(row: Record<string, unknown>): Lembrete {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    titulo: row.titulo as string,
    conteudo: row.conteudo as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function listLembretes(userId: string): Promise<Lembrete[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lembretes")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  return (data ?? []).map(mapLembrete);
}

export async function createLembrete(input: {
  userId: string;
  titulo: string;
  conteudo: string;
}): Promise<Lembrete> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lembretes")
    .insert({ user_id: input.userId, titulo: input.titulo, conteudo: input.conteudo })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Erro ao criar lembrete");
  return mapLembrete(data);
}

export async function updateLembrete(
  id: string,
  input: { titulo: string; conteudo: string }
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("lembretes")
    .update({ titulo: input.titulo, conteudo: input.conteudo, updated_at: new Date().toISOString() })
    .eq("id", id);
}

export async function deleteLembrete(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("lembretes").delete().eq("id", id);
}

// --- Relatório de obra (atualizações semanais, sempre visíveis ao cliente) ---

function mapRelatorioObra(row: Record<string, unknown>): RelatorioObra {
  return {
    id: row.id as string,
    obraId: row.obra_id as string,
    data: row.data as string,
    texto: row.texto as string,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
  };
}

export async function listRelatoriosObra(obraId: string): Promise<RelatorioObra[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("relatorios_obra")
    .select("*")
    .eq("obra_id", obraId)
    .order("data", { ascending: false });
  return (data ?? []).map(mapRelatorioObra);
}

export async function createRelatorioObra(input: {
  obraId: string;
  data: string;
  texto: string;
  createdBy: string;
}): Promise<RelatorioObra> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("relatorios_obra")
    .insert({
      obra_id: input.obraId,
      data: input.data,
      texto: input.texto,
      created_by: input.createdBy,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Erro ao criar relatório de obra");
  return mapRelatorioObra(data);
}

export async function deleteRelatorioObra(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("relatorios_obra").delete().eq("id", id);
}

// --- Pagamentos (fluxo de caixa) ---

function mapPagamento(row: Record<string, unknown>): Pagamento {
  return {
    id: row.id as string,
    obraId: row.obra_id as string,
    descricao: row.descricao as string,
    valor: Number(row.valor),
    dataPrevista: row.data_prevista as string,
    recebido: Boolean(row.recebido),
    arquivoId: (row.arquivo_id as string | null) ?? null,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
  };
}

export async function listPagamentos(obraId: string): Promise<Pagamento[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pagamentos")
    .select("*")
    .eq("obra_id", obraId)
    .order("data_prevista", { ascending: true });
  return (data ?? []).map(mapPagamento);
}

export type PagamentoComObra = Pagamento & { obraNome: string; regiao: Regiao };

export async function listPagamentosGlobais(): Promise<PagamentoComObra[]> {
  const supabase = await createClient();
  const [pagRows, obrasRows] = await Promise.all([
    fetchAllRows(supabase, "pagamentos", "*"),
    fetchAllRows(supabase, "obras", "id, nome, regiao"),
  ]);
  const obraMap = new Map(
    (obrasRows ?? []).map((o) => [o.id as string, { nome: o.nome as string, regiao: o.regiao as Regiao }])
  );
  return (pagRows ?? [])
    .map(mapPagamento)
    .map((p) => ({
      ...p,
      obraNome: obraMap.get(p.obraId)?.nome ?? "—",
      regiao: obraMap.get(p.obraId)?.regiao ?? REGIOES[0],
    }));
}

export type LancamentoComRegiao = { obraId: string; valor: number; data: string; regiao: Regiao };

export async function listLancamentosGlobais(): Promise<LancamentoComRegiao[]> {
  const supabase = await createClient();
  const [lancRows, obrasRows] = await Promise.all([
    fetchAllRows(supabase, "lancamentos", "obra_id, valor, data"),
    fetchAllRows(supabase, "obras", "id, regiao"),
  ]);
  const obraMap = new Map((obrasRows ?? []).map((o) => [o.id as string, o.regiao as Regiao]));
  return (lancRows ?? []).map((l) => ({
    obraId: l.obra_id as string,
    valor: Number(l.valor),
    data: l.data as string,
    regiao: obraMap.get(l.obra_id as string) ?? REGIOES[0],
  }));
}

export type CustoFixoComRegiao = { valor: number; dataVencimento: string; regiao: Regiao };

export async function listCustosFixosGlobais(): Promise<CustoFixoComRegiao[]> {
  const supabase = await createClient();
  const rows = await fetchAllRows(supabase, "custos_fixos", "valor, data_vencimento, regiao");
  return (rows ?? []).map((c) => ({
    valor: Number(c.valor),
    dataVencimento: c.data_vencimento as string,
    regiao: c.regiao as Regiao,
  }));
}

export async function createPagamento(input: {
  obraId: string;
  descricao: string;
  valor: number;
  dataPrevista: string;
  arquivoId?: string | null;
  createdBy: string;
}): Promise<Pagamento> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pagamentos")
    .insert({
      obra_id: input.obraId,
      descricao: input.descricao,
      valor: input.valor,
      data_prevista: input.dataPrevista,
      arquivo_id: input.arquivoId ?? null,
      created_by: input.createdBy,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Erro ao criar pagamento");
  return mapPagamento(data);
}

export async function createPagamentos(
  itens: {
    obraId: string;
    descricao: string;
    valor: number;
    dataPrevista: string;
    arquivoId?: string | null;
    createdBy: string;
  }[]
): Promise<Pagamento[]> {
  if (itens.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pagamentos")
    .insert(
      itens.map((item) => ({
        obra_id: item.obraId,
        descricao: item.descricao,
        valor: item.valor,
        data_prevista: item.dataPrevista,
        arquivo_id: item.arquivoId ?? null,
        created_by: item.createdBy,
      }))
    )
    .select();
  if (error || !data) throw new Error(error?.message ?? "Erro ao criar pagamentos");
  return data.map(mapPagamento);
}

export async function updatePagamentoRecebido(id: string, recebido: boolean): Promise<void> {
  const supabase = await createClient();
  await supabase.from("pagamentos").update({ recebido }).eq("id", id);
}

export async function updatePagamentoData(id: string, dataPrevista: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("pagamentos").update({ data_prevista: dataPrevista }).eq("id", id);
}

export async function deletePagamento(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("pagamentos").delete().eq("id", id);
}

// --- Datas importantes ---

function mapDataImportante(row: Record<string, unknown>): DataImportante {
  return {
    id: row.id as string,
    titulo: row.titulo as string,
    descricao: row.descricao as string,
    data: row.data as string,
    alertaDiasAntes: Number(row.alerta_dias_antes),
    alertaEnviado: Boolean(row.alerta_enviado),
    recorrente: Boolean(row.recorrente),
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
  };
}

export async function listDatasImportantes(): Promise<DataImportante[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("datas_importantes")
    .select("*")
    .order("data", { ascending: true });
  return (data ?? []).map(mapDataImportante);
}

export async function createDataImportante(input: {
  titulo: string;
  descricao: string;
  data: string;
  alertaDiasAntes: number;
  recorrente: boolean;
  createdBy: string;
}): Promise<DataImportante> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("datas_importantes")
    .insert({
      titulo: input.titulo,
      descricao: input.descricao,
      data: input.data,
      alerta_dias_antes: input.alertaDiasAntes,
      recorrente: input.recorrente,
      created_by: input.createdBy,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Erro ao criar data importante");
  return mapDataImportante(data);
}

export async function deleteDataImportante(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("datas_importantes").delete().eq("id", id);
}
