import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentUser } from "@/lib/auth";
import { calcularPrecificacao, getObra, getOrcamentoParametros, listOrcamentoItens, listOrcamentos } from "@/lib/store";

function buildMaterialSheet(itens: Awaited<ReturnType<typeof listOrcamentoItens>>, custoDaObra: number) {
  const rows: (string | number)[][] = [
    ["ORÇAMENTO MATERIAL + MÃO DE OBRA"],
    ["Serviço", "Material", "Valor", "Quant.", "Und.", "Valor Total", "Observação"],
  ];

  const porEtapa = new Map<string, typeof itens>();
  for (const item of itens) {
    if (!porEtapa.has(item.etapa)) porEtapa.set(item.etapa, []);
    porEtapa.get(item.etapa)!.push(item);
  }

  for (const [etapa, items] of porEtapa) {
    items.forEach((item, idx) => {
      rows.push([
        idx === 0 ? etapa : "",
        item.descricao,
        item.valorUnitario,
        item.quantidade,
        item.unidade,
        item.valorTotal,
        item.observacao,
      ]);
    });
    const subtotal = items.reduce((sum, i) => sum + i.valorTotal, 0);
    rows.push(["", "", "", "", "", subtotal, ""]);
  }

  rows.push([]);
  rows.push(["", "", "Custo da Obra", "", "", custoDaObra, ""]);

  return XLSX.utils.aoa_to_sheet(rows);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ obraId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });

  const { obraId } = await params;
  const obra = await getObra(obraId);
  if (!obra) return NextResponse.json({ error: "Obra não encontrada" }, { status: 404 });

  const orcamentoParam = req.nextUrl.searchParams.get("orcamento");
  const orcamentos = await listOrcamentos(obraId);
  const orcamentoId =
    orcamentoParam && orcamentos.some((o) => o.id === orcamentoParam) ? orcamentoParam : orcamentos[0]?.id;
  if (!orcamentoId) return NextResponse.json({ error: "Nenhuma planilha de orçamento encontrada" }, { status: 404 });

  const [itens, parametros] = await Promise.all([
    listOrcamentoItens(orcamentoId),
    getOrcamentoParametros(orcamentoId),
  ]);
  const custoDaObra = itens.reduce((s, i) => s + i.valorTotal, 0);
  const precificacao = calcularPrecificacao(custoDaObra, parametros);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, buildMaterialSheet(itens, custoDaObra), "Material");

  const resumo = XLSX.utils.aoa_to_sheet([
    ["Resumo do orçamento", obra.nome],
    [],
    ["Custo da Obra", custoDaObra],
    ["+ Margem Vekio", `${parametros.margemVekio}%`],
    ["= Base de cálculo Vekio", precificacao.baseCalculo],
    [],
    ["+ RT", `${parametros.rt}%`, precificacao.rtValor],
    ["+ IMPOSTO", `${parametros.imposto}%`, precificacao.impostoValor],
    [],
    ["= Valor de venda", precificacao.valorVenda],
    [],
    ["= Margem Real", precificacao.margemReal],
    ["= Margem Real %", `${precificacao.margemRealPercentual.toFixed(2)}%`],
    [],
    ["Lucratividade esperada", `${parametros.lucratividadeEsperada}%`],
    ["Aproximação da meta", `${precificacao.aproximacaoMeta.toFixed(2)}%`],
  ]);
  XLSX.utils.book_append_sheet(workbook, resumo, "Resumo");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const filename = `Orcamento_${obra.nome.replace(/[^a-zA-Z0-9]+/g, "_")}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
