// Contas financeiras do assistente. Tudo aqui é cálculo puro (sem banco e sem IA): o assistente só
// escolhe o que consultar, e os números saem sempre daqui. As definições seguem as telas do sistema
// (Fluxo de Caixa e Financeiro Global), para a IA e o painel mostrarem os mesmos valores.

export type Parcela = {
  id: string;
  obraId: string;
  obraNome: string;
  clienteNome: string;
  regiao: string;
  descricao: string;
  valor: number;
  dataPrevista: string; // AAAA-MM-DD
  recebido: boolean;
};

export type Gasto = { valor: number; data: string; regiao: string };
export type ContaFixa = { valor: number; dataVencimento: string; regiao: string; status?: string };

export const arredondar = (n: number) => Math.round(n * 100) / 100;
const somar = (l: { valor: number }[]) => arredondar(l.reduce((t, x) => t + x.valor, 0));

export function normalizar(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

type FiltroObras = { regiao?: string; excluirObraIds?: string[]; somenteObraIds?: string[] };

export function filtrarParcelas(parcelas: Parcela[], f: FiltroObras): Parcela[] {
  let l = parcelas;
  if (f.regiao) l = l.filter((p) => normalizar(p.regiao) === normalizar(f.regiao!));
  if (f.excluirObraIds?.length) l = l.filter((p) => !f.excluirObraIds!.includes(p.obraId));
  if (f.somenteObraIds?.length) l = l.filter((p) => f.somenteObraIds!.includes(p.obraId));
  return l;
}

const resumoLista = (l: Parcela[]) => ({ valor: somar(l), parcelas: l.length });

// Quanto ainda falta receber dos clientes (parcelas não recebidas), pela data prevista.
export function calcularAReceber(parcelas: Parcela[], o: { ano: string; hoje: string } & FiltroObras) {
  const todas = filtrarParcelas(parcelas, o);
  const pendentes = todas.filter((p) => !p.recebido);
  const doAno = (p: Parcela) => p.dataPrevista.startsWith(o.ano);
  const vencidasDoAno = pendentes.filter((p) => doAno(p) && p.dataPrevista < o.hoje);
  const aVencerNoAno = pendentes.filter((p) => doAno(p) && p.dataPrevista >= o.hoje);
  const anosAnteriores = pendentes.filter((p) => p.dataPrevista.slice(0, 4) < o.ano);
  const anosSeguintes = pendentes.filter((p) => p.dataPrevista.slice(0, 4) > o.ano);
  const doAnoPendentes = [...vencidasDoAno, ...aVencerNoAno];

  const porMes: Record<string, number> = {};
  for (const p of doAnoPendentes) {
    const m = p.dataPrevista.slice(5, 7);
    porMes[m] = arredondar((porMes[m] ?? 0) + p.valor);
  }
  const porObra = Object.values(
    doAnoPendentes.reduce<Record<string, { obra: string; obra_id: string; cliente: string; valor: number; parcelas: number }>>(
      (acc, p) => {
        const i = (acc[p.obraId] ??= { obra: p.obraNome, obra_id: p.obraId, cliente: p.clienteNome, valor: 0, parcelas: 0 });
        i.valor = arredondar(i.valor + p.valor);
        i.parcelas += 1;
        return acc;
      },
      {}
    )
  ).sort((a, b) => b.valor - a.valor);

  return {
    ano: o.ano,
    a_receber_no_ano_total: somar(doAnoPendentes),
    a_vencer_de_hoje_ate_o_fim_do_ano: resumoLista(aVencerNoAno),
    vencidas_com_data_no_ano_ainda_nao_recebidas: resumoLista(vencidasDoAno),
    atrasadas_de_anos_anteriores_ainda_nao_recebidas: resumoLista(anosAnteriores),
    pendentes_com_data_em_anos_seguintes: resumoLista(anosSeguintes),
    ja_recebido_no_ano: somar(todas.filter((p) => p.recebido && doAno(p))),
    pendente_do_ano_por_mes: porMes,
    pendente_do_ano_por_obra: porObra,
  };
}

// Entradas e saídas de um período, igual ao saldo projetado da tela Fluxo de Caixa:
// entradas = parcelas (recebidas + previstas) pela data prevista; saídas = gastos lançados nas obras
// + contas fixas pela data de vencimento.
export function calcularFluxo(
  d: { parcelas: Parcela[]; gastos: Gasto[]; contasFixas: ContaFixa[] },
  o: { de: string; ate: string; hoje: string; regiao?: string }
) {
  const dentro = (data: string) => data >= o.de && data <= o.ate;
  const reg = (r: string) => !o.regiao || normalizar(r) === normalizar(o.regiao);
  const parcelas = d.parcelas.filter((p) => reg(p.regiao) && dentro(p.dataPrevista));
  const gastos = d.gastos.filter((g) => reg(g.regiao) && dentro(g.data));
  const contas = d.contasFixas.filter((c) => reg(c.regiao) && dentro(c.dataVencimento));

  const recebidas = parcelas.filter((p) => p.recebido);
  const previstas = parcelas.filter((p) => !p.recebido);
  const entradas = arredondar(somar(recebidas) + somar(previstas));
  const saidas = arredondar(somar(gastos) + somar(contas));

  const meses: Record<string, { entradas: number; saidas: number; saldo: number }> = {};
  const mes = (data: string) => (meses[data.slice(0, 7)] ??= { entradas: 0, saidas: 0, saldo: 0 });
  for (const p of parcelas) mes(p.dataPrevista).entradas = arredondar(mes(p.dataPrevista).entradas + p.valor);
  for (const g of gastos) mes(g.data).saidas = arredondar(mes(g.data).saidas + g.valor);
  for (const c of contas) mes(c.dataVencimento).saidas = arredondar(mes(c.dataVencimento).saidas + c.valor);
  for (const m of Object.values(meses)) m.saldo = arredondar(m.entradas - m.saidas);

  return {
    periodo: { de: o.de, ate: o.ate },
    entradas_total: entradas,
    entradas_ja_recebidas: somar(recebidas),
    entradas_previstas_a_receber: somar(previstas),
    saidas_total: saidas,
    saidas_gastos_lancados_nas_obras: somar(gastos),
    saidas_contas_fixas: somar(contas),
    contas_fixas_pendentes: somar(contas.filter((c) => c.status === "pendente")),
    saldo_projetado: arredondar(entradas - saidas),
    parcelas_em_atraso_no_periodo: resumoLista(previstas.filter((p) => p.dataPrevista < o.hoje)),
    por_mes: Object.fromEntries(Object.entries(meses).sort(([a], [b]) => a.localeCompare(b))),
  };
}

// Procura obras pelo nome do cliente ou da obra (sem acento, parte do nome). Várias pessoas diferentes
// com o mesmo trecho de nome: devolve a lista para o assistente perguntar qual.
export function acharObras<T extends { id: string; nome: string; clienteNome: string }>(obras: T[], busca: string) {
  const b = normalizar(busca);
  if (!b) return [];
  return obras.filter((o) => normalizar(o.clienteNome).includes(b) || normalizar(o.nome).includes(b));
}

export function resumirParcelasDaObra(parcelas: Parcela[], hoje: string) {
  const pend = parcelas.filter((p) => !p.recebido).sort((a, b) => a.dataPrevista.localeCompare(b.dataPrevista));
  const vencidas = pend.filter((p) => p.dataPrevista < hoje);
  return {
    recebido: somar(parcelas.filter((p) => p.recebido)),
    a_receber_parcelas_pendentes: resumoLista(pend),
    das_quais_vencidas: resumoLista(vencidas),
    proximas_parcelas: pend
      .slice(0, 12)
      .map((p) => ({ descricao: p.descricao, valor: p.valor, data_prevista: p.dataPrevista, vencida: p.dataPrevista < hoje })),
  };
}
