import Link from "next/link";
import { notFound } from "next/navigation";
import { getObra, getObraTotais, listCategorias, listLancamentos } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PrintButton } from "@/components/print-button";
import { RelatorioFiltro } from "@/components/relatorio-filtro";
import { ArrowLeft } from "lucide-react";
import { CATEGORIA_MAO_DE_OBRA } from "@/lib/types";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

function chaveNome(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

type LinhaMO = { nome: string; total: number; qtd: number; setores: Set<string> };

export default async function RelatorioObraPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ inicio?: string; fim?: string; categoriaId?: string }>;
}) {
  const { id } = await params;
  const { inicio, fim, categoriaId } = await searchParams;
  const obra = await getObra(id);
  if (!obra) notFound();
  const isAdmin = (await getCurrentUser())?.role === "admin";

  const [totais, todosLancamentos, categorias] = await Promise.all([
    getObraTotais(id),
    listLancamentos(id),
    listCategorias(),
  ]);

  const filtrado = !!(inicio || fim || categoriaId);
  const lancamentos = todosLancamentos.filter(
    (l) =>
      (!inicio || l.data >= inicio) &&
      (!fim || l.data <= fim) &&
      (!categoriaId || l.categoriaId === categoriaId)
  );

  const totalGastoPeriodo = lancamentos.reduce((sum, l) => sum + l.valor, 0);
  const porCategoriaPeriodo = filtrado
    ? Array.from(
        lancamentos.reduce((map, l) => {
          map.set(l.categoriaId, (map.get(l.categoriaId) ?? 0) + l.valor);
          return map;
        }, new Map<string, number>())
      ).map(([catId, total]) => ({
        categoriaId: catId,
        categoriaNome: categorias.find((c) => c.id === catId)?.nome ?? "—",
        total,
      }))
    : totais.porCategoria;

  // Mão de obra: o total já aparece em "Gastos por categoria"; aqui abre quanto
  // foi gasto em cada setor e com cada profissional (fornecedor).
  const maoDeObraId = categorias.find((c) => c.nome === CATEGORIA_MAO_DE_OBRA)?.id;
  const maoDeObra = maoDeObraId ? lancamentos.filter((l) => l.categoriaId === maoDeObraId) : [];
  const totalMaoDeObra = maoDeObra.reduce((sum, l) => sum + l.valor, 0);

  const porSetor = new Map<string, { total: number; qtd: number }>();
  const porProfissional = new Map<string, LinhaMO>();
  for (const l of maoDeObra) {
    const setor = l.setor || "Sem setor definido";
    const atualSetor = porSetor.get(setor) ?? { total: 0, qtd: 0 };
    porSetor.set(setor, { total: atualSetor.total + l.valor, qtd: atualSetor.qtd + 1 });

    const nome = l.fornecedor?.trim() || "Sem profissional informado";
    const chave = chaveNome(nome);
    const atual = porProfissional.get(chave) ?? { nome, total: 0, qtd: 0, setores: new Set<string>() };
    atual.total += l.valor;
    atual.qtd += 1;
    if (l.setor) atual.setores.add(l.setor);
    porProfissional.set(chave, atual);
  }
  const setoresOrdenados = Array.from(porSetor.entries()).sort((a, b) => b[1].total - a[1].total);
  const profissionaisOrdenados = Array.from(porProfissional.values()).sort((a, b) => b.total - a.total);

  const categoriaNome = (catId: string) => categorias.find((c) => c.id === catId)?.nome ?? "—";
  const categoriaFiltradaNome = categoriaId ? categoriaNome(categoriaId) : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6 print:p-0">
      <Link
        href={`/obras/${obra.id}`}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground print:hidden"
      >
        <ArrowLeft className="size-4" />
        Voltar para {obra.nome}
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Relatório de gastos — {obra.nome}</h1>
          <p className="text-sm text-muted-foreground">
            {obra.endereco} · Cliente: {obra.clienteNome} · {obra.regiao}
          </p>
          <p className="text-xs text-muted-foreground">
            Gerado em {new Date().toLocaleDateString("pt-BR")}
            {inicio || fim
              ? ` · Período: ${inicio ? formatDate(inicio) : "início"} a ${fim ? formatDate(fim) : "hoje"}`
              : ""}
            {categoriaFiltradaNome && ` · Categoria: ${categoriaFiltradaNome}`}
          </p>
        </div>
        <PrintButton />
      </div>

      <RelatorioFiltro inicio={inicio} fim={fim} categoriaId={categoriaId} categorias={categorias} />

      <div
        className={`grid gap-4 rounded-lg border p-4 text-sm ${isAdmin ? "grid-cols-3" : "grid-cols-1"}`}
      >
        {isAdmin && (
          <div>
            <p className="text-muted-foreground">Valor de venda</p>
            <p className="text-base font-semibold">{formatCurrency(obra.valorVenda)}</p>
          </div>
        )}
        <div>
          <p className="text-muted-foreground">{filtrado ? "Total gasto (filtro)" : "Total gasto"}</p>
          <p className="text-base font-semibold">
            {formatCurrency(filtrado ? totalGastoPeriodo : totais.totalGasto)}
          </p>
        </div>
        {isAdmin && (
          <div>
            <p className="text-muted-foreground">Margem</p>
            <p className="text-base font-semibold">{formatCurrency(totais.margem)}</p>
            {obra.valorVenda + obra.valorAditivos > 0 && (
              <p className="text-xs text-muted-foreground">
                {((totais.margem / (obra.valorVenda + obra.valorAditivos)) * 100).toFixed(1)}% do contrato
              </p>
            )}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">
          Gastos por categoria{filtrado ? " (filtro)" : ""}
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {porCategoriaPeriodo.map((c) => (
              <TableRow key={c.categoriaId}>
                <TableCell>{c.categoriaNome}</TableCell>
                <TableCell className="text-right">{formatCurrency(c.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {maoDeObra.length > 0 && (
        <>
          <div>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              Mão de obra por setor{filtrado ? " (filtro)" : ""} — total {formatCurrency(totalMaoDeObra)}
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Setor</TableHead>
                  <TableHead className="text-right">Lançamentos</TableHead>
                  <TableHead className="text-right">% da mão de obra</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {setoresOrdenados.map(([setor, v]) => (
                  <TableRow key={setor}>
                    <TableCell>{setor}</TableCell>
                    <TableCell className="text-right">{v.qtd}</TableCell>
                    <TableCell className="text-right">
                      {totalMaoDeObra > 0 ? ((v.total / totalMaoDeObra) * 100).toFixed(1) : "0.0"}%
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(v.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              Mão de obra por profissional{filtrado ? " (filtro)" : ""}
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profissional / fornecedor</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead className="text-right">Lançamentos</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profissionaisOrdenados.map((p) => (
                  <TableRow key={p.nome}>
                    <TableCell className="whitespace-normal break-words">{p.nome}</TableCell>
                    <TableCell className="whitespace-normal">
                      {p.setores.size > 0 ? Array.from(p.setores).join(", ") : "—"}
                    </TableCell>
                    <TableCell className="text-right">{p.qtd}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">
          {filtrado ? "Lançamentos filtrados" : "Todos os lançamentos"}
        </h2>
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Data</TableHead>
              <TableHead className="w-28">Categoria</TableHead>
              <TableHead className="w-24">Fornecedor</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-24 text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lancamentos.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="whitespace-normal break-words">{formatDate(l.data)}</TableCell>
                <TableCell className="whitespace-normal break-words">
                  {categoriaNome(l.categoriaId)}
                  {l.setor && <span className="block text-xs text-muted-foreground">{l.setor}</span>}
                </TableCell>
                <TableCell className="whitespace-normal break-words">{l.fornecedor || "—"}</TableCell>
                <TableCell className="whitespace-normal break-words">{l.descricao}</TableCell>
                <TableCell className="text-right whitespace-nowrap">{formatCurrency(l.valor)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
