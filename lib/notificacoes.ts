import { createClient } from "./supabase/server";
import { enviarPushParaEquipe } from "./push";
import type { NotificacaoItem, NotificacaoTipo, User } from "./types";

const FUSO = "America/Sao_Paulo";

function hojeSP() {
  return new Date().toLocaleDateString("en-CA", { timeZone: FUSO }); // YYYY-MM-DD
}

function inicioDoDiaSP(hoje: string) {
  return new Date(`${hoje}T00:00:00-03:00`).toISOString();
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Cada tipo de aviso abre a aba da obra onde a coisa realmente está.
export function linkDaObra(obraId: string, tipo: NotificacaoTipo): string {
  const aba: Partial<Record<NotificacaoTipo, string>> = {
    lancamentos: "financeiro",
    fotos: "documentos",
    documentos: "documentos",
    parcela_vence: "pagamentos",
  };
  const a = aba[tipo];
  return a ? `/obras/${obraId}?aba=${a}` : `/obras/${obraId}`;
}

// Notificações antigas guardaram só "/obras/ID" — corrige na hora de listar.
function corrigirLink(tipo: NotificacaoTipo, link: string | null): string | null {
  const m = link?.match(/^\/obras\/([0-9a-f-]{36})$/i);
  return m ? linkDaObra(m[1], tipo) : link;
}

export function nomeParaExibir(nome: string) {
  const n = nome.trim();
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : "Alguém";
}

// As notificações nunca podem quebrar a ação que as originou — qualquer
// falha aqui (inclusive tabela ainda não criada) é silenciosamente ignorada.
export async function registrarNotificacao(n: {
  tipo: NotificacaoTipo;
  titulo: string;
  descricao: string;
  obraId?: string | null;
  obraNome?: string | null;
  link?: string | null;
  atorId: string;
  atorNome: string;
}): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from("notificacoes").insert({
      tipo: n.tipo,
      titulo: n.titulo,
      descricao: n.descricao,
      obra_id: n.obraId ?? null,
      obra_nome: n.obraNome ?? null,
      link: n.link ?? null,
      ator_id: n.atorId,
      ator_nome: n.atorNome,
    });
    await enviarPushParaEquipe({ titulo: n.titulo, descricao: n.descricao, link: n.link ?? null }, n.atorId);
  } catch {
    // ignora
  }
}

// Ações repetidas da mesma pessoa, na mesma obra, no mesmo dia viram UMA
// notificação ("Fulano lançou 8 gastos na obra X") que volta a ficar não
// lida a cada ação nova.
async function registrarAcaoAgrupada(a: {
  tipo: NotificacaoTipo;
  titulo: string;
  atorId: string;
  atorNome: string;
  obraId: string;
  obraNome: string;
  descricao: (quantidade: number) => string;
}): Promise<void> {
  try {
    const supabase = await createClient();
    // "lanc" mantém a chave antiga dos gastos, pra não duplicar a notificação
    // de quem já lançou gastos hoje antes desta mudança.
    const prefixo = a.tipo === "lancamentos" ? "lanc" : a.tipo;
    const chave = `${prefixo}:${a.atorId}:${a.obraId}:${hojeSP()}`;
    const { data: existente } = await supabase
      .from("notificacoes")
      .select("id, quantidade")
      .eq("chave", chave)
      .maybeSingle();

    const quantidade = (existente?.quantidade ?? 0) + 1;
    const descricao = a.descricao(quantidade);

    if (existente) {
      await supabase
        .from("notificacoes")
        .update({ quantidade, descricao, atualizada_em: new Date().toISOString() })
        .eq("id", existente.id);
    } else {
      await supabase.from("notificacoes").insert({
        tipo: a.tipo,
        titulo: a.titulo,
        descricao,
        obra_id: a.obraId,
        obra_nome: a.obraNome,
        link: linkDaObra(a.obraId, a.tipo),
        ator_id: a.atorId,
        ator_nome: a.atorNome,
        chave,
        quantidade,
      });
      // Push só na primeira ação do dia do grupo, pra não encher o celular
      // a cada gasto/arquivo seguinte.
      await enviarPushParaEquipe(
        { titulo: a.titulo, descricao, link: linkDaObra(a.obraId, a.tipo) },
        a.atorId
      );
    }
  } catch {
    // ignora
  }
}

export async function registrarGastoLancado(a: {
  atorId: string;
  atorNome: string;
  obraId: string;
  obraNome: string;
}): Promise<void> {
  await registrarAcaoAgrupada({
    ...a,
    tipo: "lancamentos",
    titulo: "Gastos lançados",
    descricao: (n) =>
      `${nomeParaExibir(a.atorNome)} lançou ${n} ${n === 1 ? "gasto" : "gastos"} na obra ${a.obraNome}.`,
  });
}

export async function registrarArquivoEnviado(a: {
  atorId: string;
  atorNome: string;
  obraId: string;
  obraNome: string;
  mimeType: string;
}): Promise<void> {
  const ehMidia = a.mimeType.startsWith("image/") || a.mimeType.startsWith("video/");
  await registrarAcaoAgrupada({
    ...a,
    tipo: ehMidia ? "fotos" : "documentos",
    titulo: ehMidia ? "Fotos enviadas" : "Documentos enviados",
    descricao: (n) =>
      `${nomeParaExibir(a.atorNome)} enviou ${n} ${
        ehMidia ? (n === 1 ? "foto/vídeo" : "fotos/vídeos") : n === 1 ? "documento" : "documentos"
      } na obra ${a.obraNome}.`,
  });
}

export async function marcarNotificacoesLidas(userId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ notificacoes_lidas_ate: new Date().toISOString() })
    .eq("id", userId);
}

export async function marcarNotificacaoLida(userId: string, notificacaoId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("notificacoes_lidas")
    .upsert(
      { user_id: userId, notificacao_id: notificacaoId, lida_em: new Date().toISOString() },
      { onConflict: "user_id,notificacao_id" }
    );
}

export async function listarNotificacoes(
  user: User
): Promise<{ itens: NotificacaoItem[]; naoLidas: number }> {
  const supabase = await createClient();
  const hoje = hojeSP();
  const inicioHoje = inicioDoDiaSP(hoje);
  const isAdmin = user.role === "admin";

  const { data: perfil } = await supabase
    .from("profiles")
    .select("notificacoes_lidas_ate")
    .eq("id", user.id)
    .maybeSingle();
  const lidasAte = perfil?.notificacoes_lidas_ate
    ? new Date(perfil.notificacoes_lidas_ate as string).getTime()
    : 0;

  // Notificações que a pessoa já abriu uma a uma (tabela pode ainda não existir).
  const lidasPorId = new Map<string, number>();
  const { data: lidasRows } = await supabase
    .from("notificacoes_lidas")
    .select("notificacao_id, lida_em")
    .eq("user_id", user.id);
  for (const r of lidasRows ?? []) {
    lidasPorId.set(r.notificacao_id as string, new Date(r.lida_em as string).getTime());
  }

  // --- Avisos por data (calculados na hora) ---
  const avisos: NotificacaoItem[] = [];

  if (isAdmin) {
    const { data: parcelas } = await supabase
      .from("pagamentos")
      .select("id, descricao, valor, obra_id, obras(nome)")
      .eq("data_prevista", hoje)
      .eq("recebido", false);
    for (const p of (parcelas ?? []) as unknown as {
      id: string;
      descricao: string;
      valor: number;
      obra_id: string;
      obras: { nome: string } | null;
    }[]) {
      avisos.push({
        id: `calc:parcela:${p.id}:${hoje}`,
        tipo: "parcela_vence",
        titulo: `Hoje vence a parcela do cliente ${p.obras?.nome ?? ""}`.trim(),
        descricao: `${p.descricao} — ${formatCurrency(Number(p.valor))}`,
        obraNome: p.obras?.nome ?? null,
        link: linkDaObra(p.obra_id, "parcela_vence"),
        quando: inicioHoje,
        lida: false,
        propria: false,
      });
    }

    const { data: contas } = await supabase
      .from("custos_fixos")
      .select("id, nome, valor, regiao")
      .eq("data_vencimento", hoje)
      .eq("status", "pendente");
    for (const c of contas ?? []) {
      avisos.push({
        id: `calc:conta:${c.id}:${hoje}`,
        tipo: "conta_pagar",
        titulo: `Hoje é dia de pagar: ${c.nome}`,
        descricao: `${formatCurrency(Number(c.valor))} · ${c.regiao}`,
        obraNome: null,
        link: "/financeiro",
        quando: inicioHoje,
        lida: false,
        propria: false,
      });
    }
  }

  // Datas importantes (aniversários etc.) — a tabela só é legível por admin.
  const { data: datas } = await supabase
    .from("datas_importantes")
    .select("id, titulo, descricao, data, recorrente");
  const mesDiaHoje = hoje.slice(5);
  for (const d of datas ?? []) {
    const ehHoje = d.recorrente ? String(d.data).slice(5) === mesDiaHoje : d.data === hoje;
    if (!ehHoje) continue;
    avisos.push({
      id: `calc:data:${d.id}:${hoje}`,
      tipo: "data_importante",
      titulo: `Hoje: ${d.titulo}`,
      descricao: d.descricao ?? "",
      obraNome: null,
      link: "/datas-importantes",
      quando: inicioHoje,
      lida: false,
      propria: false,
    });
  }

  // --- Eventos registrados (últimos 14 dias) ---
  // As ações da própria pessoa também aparecem (como "Você ..."), formando a
  // linha do tempo do dia dela, mas nunca contam como não lidas.
  const desde = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const { data: eventos } = await supabase
    .from("notificacoes")
    .select("id, tipo, titulo, descricao, obra_nome, link, ator_id, ator_nome, atualizada_em")
    .gte("atualizada_em", desde)
    .order("atualizada_em", { ascending: false })
    .limit(80);

  const registrados: NotificacaoItem[] = (eventos ?? []).map((e) => {
    const propria = e.ator_id === user.id;
    let descricao = e.descricao as string;
    if (propria) {
      const nome = nomeParaExibir((e.ator_nome as string) ?? "");
      descricao = descricao.startsWith(nome)
        ? `Você${descricao.slice(nome.length)}`
        : descricao.replace(nome, "você");
    }
    return {
      id: e.id as string,
      tipo: e.tipo as NotificacaoTipo,
      titulo: e.titulo as string,
      descricao,
      obraNome: (e.obra_nome as string | null) ?? null,
      link: corrigirLink(e.tipo as NotificacaoTipo, (e.link as string | null) ?? null),
      quando: e.atualizada_em as string,
      lida: false,
      propria,
    };
  });

  const itens = [...avisos, ...registrados].map((i) => ({
    ...i,
    lida:
      i.propria ||
      new Date(i.quando).getTime() <= lidasAte ||
      (lidasPorId.get(i.id) ?? 0) >= new Date(i.quando).getTime(),
  }));

  return { itens, naoLidas: itens.filter((i) => !i.lida).length };
}
