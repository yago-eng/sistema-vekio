import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  createOrcamento,
  getObra,
  getObraTotais,
  getOrcamentoParametros,
  listArquivos,
  listCategorias,
  listEtapas,
  listLancamentos,
  getOrcamentoEscopo,
  listClientesDaObra,
  listObraAditivos,
  listOrcamentoItens,
  listOrcamentos,
  listPagamentos,
  listRelatoriosObra,
  registrarAcessoObra,
} from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LancamentoForm } from "@/components/lancamento-form";
import { LancamentoList } from "@/components/lancamento-list";
import { CategoriaChart } from "@/components/categoria-chart";
import { ArquivoUploadForm } from "@/components/arquivo-upload-form";
import { ArquivoList } from "@/components/arquivo-list";
import { EtapaFormDialog } from "@/components/etapa-form-dialog";
import { GanttChart } from "@/components/gantt-chart";
import { OrcamentoUploadForm } from "@/components/orcamento-upload-form";
import { OrcamentoItemFormDialog } from "@/components/orcamento-item-form-dialog";
import { OrcamentoTable } from "@/components/orcamento-table";
import { OrcamentoPrecificacao } from "@/components/orcamento-precificacao";
import { OrcamentoTabs } from "@/components/orcamento-tabs";
import { ObraStatusSelect } from "@/components/obra-status-select";
import { EditarObraDialog } from "@/components/editar-obra-dialog";
import { ExcluirObraDialog } from "@/components/excluir-obra-dialog";
import { ObraAditivoForm } from "@/components/obra-aditivo-form";
import { ObraAditivoDeleteButton } from "@/components/obra-aditivo-delete-button";
import { PipelineStatusActions } from "@/components/pipeline-status-actions";
import { PagamentoForm } from "@/components/pagamento-form";
import { PagamentoList } from "@/components/pagamento-list";
import { LerContratoDialog } from "@/components/ler-contrato-dialog";
import { GerarEscopoCard } from "@/components/gerar-escopo-card";
import { ConvidarClienteForm } from "@/components/convidar-cliente-form";
import { ClienteAcessoList } from "@/components/cliente-acesso-list";
import { RelatorioObraForm } from "@/components/relatorio-obra-form";
import { RelatorioObraList } from "@/components/relatorio-obra-list";
import { Badge } from "@/components/ui/badge";
import { FileBarChart, FileText, Download, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

export default async function ObraDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ voltarRegiao?: string; voltarAno?: string; orcamento?: string; aba?: string }>;
}) {
  const { id } = await params;
  const { voltarRegiao, voltarAno, orcamento, aba } = await searchParams;
  const obra = await getObra(id);
  if (!obra) notFound();

  const isProposta = obra.pipelineStatus === "em_andamento" || obra.pipelineStatus === "negado";
  const voltarHref = isProposta
    ? "/orcamentos"
    : voltarRegiao && voltarAno
      ? `/obras?regiao=${encodeURIComponent(voltarRegiao)}&ano=${voltarAno}`
      : "/obras";

  const currentUser = await getCurrentUser();
  const isAdmin = currentUser?.role === "admin";
  if (currentUser) await registrarAcessoObra(currentUser.id, id);

  let orcamentos: Awaited<ReturnType<typeof listOrcamentos>> = [];
  if (isAdmin) {
    orcamentos = await listOrcamentos(id);
    if (orcamentos.length === 0) {
      orcamentos = [await createOrcamento(id, "Orçamento 1")];
    }
  }
  const orcamentoId =
    orcamento && orcamentos.some((o) => o.id === orcamento) ? orcamento : orcamentos[0]?.id;

  const [totais, lancamentos, categorias, arquivos, etapas, aditivos, pagamentos, orcamentoItens, orcamentoParametros, clientes, escopo, relatoriosObra] =
    await Promise.all([
      getObraTotais(id),
      listLancamentos(id),
      listCategorias(),
      listArquivos(id),
      listEtapas(id),
      isAdmin ? listObraAditivos(id) : Promise.resolve([]),
      isAdmin ? listPagamentos(id) : Promise.resolve([]),
      isAdmin && orcamentoId ? listOrcamentoItens(orcamentoId) : Promise.resolve([]),
      isAdmin && orcamentoId ? getOrcamentoParametros(orcamentoId) : Promise.resolve(null),
      listClientesDaObra(id),
      isAdmin && orcamentoId ? getOrcamentoEscopo(orcamentoId) : Promise.resolve(undefined),
      listRelatoriosObra(id),
    ]);

  const custoDaObra = orcamentoItens.reduce((s, i) => s + i.valorTotal, 0);

  // ?aba= vem dos links das notificações; abas só de admin caem no Financeiro.
  const abasLivres = ["financeiro", "documentos", "cronograma", "relatorio-obra", "cliente"];
  const abasAdmin = ["pagamentos", "orcamento"];
  const abaInicial =
    aba && (abasLivres.includes(aba) || (isAdmin && abasAdmin.includes(aba))) ? aba : "financeiro";

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={voltarHref}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {isProposta ? "Voltar para orçamentos" : "Voltar para obras"}
      </Link>

      {isAdmin && obra.pipelineStatus === "em_andamento" && <PipelineStatusActions obraId={obra.id} />}
      {obra.pipelineStatus === "negado" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Esta proposta de orçamento foi marcada como negada.
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{obra.nome}</h1>
            {obra.pipelineStatus === "efetivado" && (
              <Badge variant="outline">Veio de orçamento</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {obra.endereco} · Cliente: {obra.clienteNome} · {obra.regiao}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && <EditarObraDialog obra={obra} />}
          {isAdmin && (
            <ExcluirObraDialog
              obraId={obra.id}
              obraNome={obra.nome}
              contagens={{
                lancamentos: lancamentos.length,
                arquivos: arquivos.length,
                etapas: etapas.length,
                pagamentos: pagamentos.length,
                relatorios: relatoriosObra.length,
                clientes: clientes.length,
              }}
            />
          )}
          <ObraStatusSelect obraId={obra.id} status={obra.status} />
          <Button
            variant="outline"
            className="gap-2"
            nativeButton={false}
            render={<Link href={`/obras/${obra.id}/relatorio`} />}
          >
            <FileBarChart className="size-4" />
            {isAdmin ? "Relatório financeiro" : "Relatório de gastos"}
          </Button>
        </div>
      </div>

      <Tabs key={abaInicial} defaultValue={abaInicial}>
        <TabsList>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="cronograma">Cronograma</TabsTrigger>
          {isAdmin && <TabsTrigger value="pagamentos">Pagamentos Recebidos</TabsTrigger>}
          <TabsTrigger value="relatorio-obra">Relatório de Obra</TabsTrigger>
          {isAdmin && <TabsTrigger value="orcamento">Orçamento</TabsTrigger>}
          <TabsTrigger value="cliente">Cliente</TabsTrigger>
        </TabsList>

        <TabsContent value="financeiro" className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {isAdmin && (
              <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Valor de venda
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatCurrency(obra.valorVenda)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Aditivos
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatCurrency(obra.valorAditivos)}
              </CardContent>
            </Card>
              </>
            )}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total gasto
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatCurrency(totais.totalGasto)}
                {isAdmin && (
                  <p className="mt-1 text-xs font-normal text-muted-foreground">
                    {totais.percentualUsado.toFixed(1)}% do valor de venda
                  </p>
                )}
              </CardContent>
            </Card>
            {isAdmin && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Margem (lucro bruto)
                </CardTitle>
              </CardHeader>
              <CardContent
                className={cn(
                  "text-2xl font-semibold",
                  totais.margem < 0 ? "text-destructive" : "text-foreground"
                )}
              >
                {formatCurrency(totais.margem)}
                <p className="mt-1 text-xs font-normal text-muted-foreground">
                  {obra.valorVenda + obra.valorAditivos > 0
                    ? `${((totais.margem / (obra.valorVenda + obra.valorAditivos)) * 100).toFixed(1)}% de margem sobre o contrato`
                    : "defina o valor de venda para ver a %"}
                </p>
              </CardContent>
            </Card>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Gastos por categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <CategoriaChart data={totais.porCategoria} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lançar gasto</CardTitle>
              </CardHeader>
              <CardContent>
                <LancamentoForm obraId={obra.id} categorias={categorias} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de lançamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <LancamentoList obraId={obra.id} lancamentos={lancamentos} categorias={categorias} />
            </CardContent>
          </Card>

        </TabsContent>

        <TabsContent value="documentos" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Enviar arquivo</CardTitle>
            </CardHeader>
            <CardContent>
              <ArquivoUploadForm obraId={obra.id} />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Arquivos da obra</CardTitle>
            </CardHeader>
            <CardContent>
              <ArquivoList obraId={obra.id} arquivos={arquivos} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cronograma" className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Etapas da obra e progresso, em formato de cronograma (Gantt).
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                nativeButton={false}
                render={<Link href={`/obras/${obra.id}/relatorio-cronograma`} target="_blank" rel="noopener noreferrer" />}
              >
                <FileBarChart className="size-4" />
                Relatório do cronograma
              </Button>
              <EtapaFormDialog obraId={obra.id} />
            </div>
          </div>
          <GanttChart obraId={obra.id} etapas={etapas} />
        </TabsContent>

        {isAdmin && (
        <TabsContent value="pagamentos" className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <p className="text-sm text-muted-foreground">
              Pagamentos previstos e recebidos do cliente para esta obra.
            </p>
            <LerContratoDialog obraId={obra.id} arquivos={arquivos} />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adicionar pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <PagamentoForm obraId={obra.id} arquivos={arquivos} />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Fluxo de pagamentos do contrato</CardTitle>
            </CardHeader>
            <CardContent>
              <PagamentoList
                obraId={obra.id}
                pagamentos={pagamentos}
                arquivos={arquivos}
                valorContrato={obra.valorVenda + obra.valorAditivos}
              />
            </CardContent>
          </Card>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold">Aditivos</h2>
            <p className="text-sm text-muted-foreground">
              Serviços adicionais ao contrato. O valor soma ao contrato da obra; você pode anexar o
              orçamento do aditivo e já cadastrar as parcelas de pagamento dele.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Aditivos</CardTitle>
              </CardHeader>
              <CardContent>
                {aditivos.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Nenhum aditivo lançado ainda.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aditivos.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>{formatDate(a.data)}</TableCell>
                          <TableCell className="whitespace-normal">
                            {a.descricao}
                            {a.arquivoId && arquivos.some((x) => x.id === a.arquivoId) && (
                              <Link
                                href={`/arquivo/${a.arquivoId}`}
                                className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                              >
                                <FileText className="size-3" />
                                {arquivos.find((x) => x.id === a.arquivoId)?.nomeOriginal}
                              </Link>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(a.valor)}
                          </TableCell>
                          <TableCell>
                            <ObraAditivoDeleteButton id={a.id} obraId={obra.id} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Adicionar aditivo</CardTitle>
              </CardHeader>
              <CardContent>
                <ObraAditivoForm obraId={obra.id} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        )}

        <TabsContent value="relatorio-obra" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Novo relatório</CardTitle>
            </CardHeader>
            <CardContent>
              <RelatorioObraForm obraId={obra.id} />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Relatórios publicados</CardTitle>
            </CardHeader>
            <CardContent>
              <RelatorioObraList obraId={obra.id} relatorios={relatoriosObra} />
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && orcamentoParametros && orcamentoId && (
          <TabsContent value="orcamento" className="flex flex-col gap-6">
            <OrcamentoTabs
              obraId={obra.id}
              orcamentos={orcamentos}
              ativoId={orcamentoId}
              basePath={`/obras/${obra.id}`}
              extraQuery={{ voltarRegiao, voltarAno }}
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Importar planilha</CardTitle>
                </CardHeader>
                <CardContent>
                  <OrcamentoUploadForm obraId={obra.id} orcamentoId={orcamentoId} />
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">Itens do orçamento</CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <OrcamentoItemFormDialog obraId={obra.id} orcamentoId={orcamentoId} />
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      nativeButton={false}
                      render={<a href={`/api/orcamento/${obra.id}/export?orcamento=${orcamentoId}`} />}
                    >
                      <Download className="size-4" />
                      Exportar Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <OrcamentoTable key={orcamentoId} obraId={obra.id} orcamentoId={orcamentoId} itens={orcamentoItens} />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Precificação</CardTitle>
              </CardHeader>
              <CardContent>
                <OrcamentoPrecificacao
                key={orcamentoId}
                  obraId={obra.id}
                  orcamentoId={orcamentoId}
                  custoDaObra={custoDaObra}
                  parametrosIniciais={orcamentoParametros}
                />
              </CardContent>
            </Card>

            {orcamentoItens.length > 0 && (
              <GerarEscopoCard obraId={obra.id} orcamentoId={orcamentoId} temEscopo={!!escopo} />
            )}
          </TabsContent>
        )}

        <TabsContent value="cliente" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Convidar cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <ConvidarClienteForm obraId={obra.id} />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Clientes com acesso</CardTitle>
            </CardHeader>
            <CardContent>
              <ClienteAcessoList obraId={obra.id} clientes={clientes} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
