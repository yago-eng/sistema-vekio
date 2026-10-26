import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  createOrcamento,
  getObra,
  getOrcamentoEscopo,
  getOrcamentoParametros,
  listArquivos,
  listOrcamentoItens,
  listOrcamentos,
} from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArquivoUploadForm } from "@/components/arquivo-upload-form";
import { ArquivoList } from "@/components/arquivo-list";
import { OrcamentoUploadForm } from "@/components/orcamento-upload-form";
import { OrcamentoItemFormDialog } from "@/components/orcamento-item-form-dialog";
import { OrcamentoTable } from "@/components/orcamento-table";
import { OrcamentoPrecificacao } from "@/components/orcamento-precificacao";
import { CarregarBaseOrcamentoButton } from "@/components/carregar-base-orcamento-button";
import { OrcamentoTabs } from "@/components/orcamento-tabs";
import { GerarEscopoCard } from "@/components/gerar-escopo-card";
import { PipelineStatusActions } from "@/components/pipeline-status-actions";
import { ArrowLeft, Download } from "lucide-react";

const statusLabel: Record<string, string> = {
  em_andamento: "Em andamento",
  efetivado: "Efetivado",
  negado: "Negado",
};

export default async function OrcamentoDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ orcamento?: string }>;
}) {
  const { id } = await params;
  const { orcamento } = await searchParams;

  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (currentUser.role !== "admin") redirect("/obras");

  const obra = await getObra(id);
  if (!obra) notFound();

  // Se já foi efetivado, é uma obra — manda para a página da obra.
  if (obra.pipelineStatus === "efetivado" || obra.pipelineStatus === null) {
    redirect(`/obras/${id}`);
  }

  let orcamentos = await listOrcamentos(id);
  if (orcamentos.length === 0) {
    const novo = await createOrcamento(id, "Orçamento 1");
    orcamentos = [novo];
  }
  const orcamentoId =
    orcamento && orcamentos.some((o) => o.id === orcamento) ? orcamento : orcamentos[0].id;

  const [orcamentoItens, orcamentoParametros, arquivos, escopo] = await Promise.all([
    listOrcamentoItens(orcamentoId),
    getOrcamentoParametros(orcamentoId),
    listArquivos(id),
    getOrcamentoEscopo(orcamentoId),
  ]);

  const custoDaObra = orcamentoItens.reduce((s, i) => s + i.valorTotal, 0);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/orcamentos"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Voltar para orçamentos
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{obra.nome}</h1>
            <Badge variant={obra.pipelineStatus === "negado" ? "destructive" : "outline"}>
              {statusLabel[obra.pipelineStatus ?? "em_andamento"]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Proposta de orçamento · Cliente: {obra.clienteNome} · {obra.regiao}
          </p>
        </div>
      </div>

      {obra.pipelineStatus === "em_andamento" && <PipelineStatusActions obraId={obra.id} />}
      {obra.pipelineStatus === "negado" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Esta proposta foi marcada como negada.
        </div>
      )}

      <Tabs defaultValue="orcamento">
        <TabsList>
          <TabsTrigger value="orcamento">Orçamento</TabsTrigger>
          <TabsTrigger value="documentos">Documentos / Projetos</TabsTrigger>
        </TabsList>

        <TabsContent value="orcamento" className="flex flex-col gap-6">
          <OrcamentoTabs
            obraId={obra.id}
            orcamentos={orcamentos}
            ativoId={orcamentoId}
            basePath={`/orcamentos/${obra.id}`}
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
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base">Itens do orçamento</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <CarregarBaseOrcamentoButton
                    obraId={obra.id}
                    orcamentoId={orcamentoId}
                    temItens={orcamentoItens.length > 0}
                  />
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
              <CardTitle className="text-base">Projetos e documentos</CardTitle>
            </CardHeader>
            <CardContent>
              <ArquivoList obraId={obra.id} arquivos={arquivos} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
