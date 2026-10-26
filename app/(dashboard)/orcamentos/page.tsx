import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listOrcamentoPropostas } from "@/lib/store";
import { REGIOES, PIPELINE_STATUS, type PipelineStatus } from "@/lib/types";
import { OrcamentoPropostaFormDialog } from "@/components/orcamento-proposta-form-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const statusVariant: Record<PipelineStatus, "outline" | "default" | "destructive"> = {
  em_andamento: "outline",
  efetivado: "default",
  negado: "destructive",
};

export default async function OrcamentosPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (currentUser.role !== "admin") redirect("/obras");

  const propostas = await listOrcamentoPropostas();

  const emAndamento = propostas.filter((p) => p.pipelineStatus === "em_andamento");
  const efetivados = propostas.filter((p) => p.pipelineStatus === "efetivado");
  const negados = propostas.filter((p) => p.pipelineStatus === "negado");
  const decididos = efetivados.length + negados.length;
  const pctEfetivado = decididos > 0 ? (efetivados.length / decididos) * 100 : 0;
  const pctNegado = decididos > 0 ? (negados.length / decididos) * 100 : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Orçamentos</h1>
          <p className="text-sm text-muted-foreground">
            Propostas de orçamento — restrito à administração.
          </p>
        </div>
        <OrcamentoPropostaFormDialog />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Propostas em andamento
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{emAndamento.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total decidido</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{decididos}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">% Efetivado</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-foreground">
            {pctEfetivado.toFixed(1)}%
            <p className="mt-1 text-xs font-normal text-muted-foreground">
              {efetivados.length} propostas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">% Negado</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-destructive">
            {pctNegado.toFixed(1)}%
            <p className="mt-1 text-xs font-normal text-muted-foreground">{negados.length} propostas</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={REGIOES[0]}>
        <TabsList>
          {REGIOES.map((r) => (
            <TabsTrigger key={r} value={r}>
              {r}
            </TabsTrigger>
          ))}
        </TabsList>

        {REGIOES.map((regiao) => {
          const propostasDaRegiao = propostas.filter((p) => p.regiao === regiao);
          return (
            <TabsContent key={regiao} value={regiao} className="flex flex-col gap-4">
              {propostasDaRegiao.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                    <p>Nenhuma proposta em {regiao} ainda.</p>
                  </CardContent>
                </Card>
              ) : (
                <Tabs defaultValue="em_andamento">
                  <TabsList>
                    {PIPELINE_STATUS.map((s) => (
                      <TabsTrigger key={s.id} value={s.id}>
                        {s.label} (
                        {propostasDaRegiao.filter((p) => p.pipelineStatus === s.id).length})
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {PIPELINE_STATUS.map((s) => {
                    const lista = propostasDaRegiao.filter((p) => p.pipelineStatus === s.id);
                    return (
                      <TabsContent key={s.id} value={s.id} className="flex flex-col gap-4">
                        {lista.length === 0 ? (
                          <p className="py-6 text-center text-sm text-muted-foreground">
                            Nenhuma proposta {s.label.toLowerCase()}.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {lista.map((p) => (
                              <Link key={p.id} href={`/orcamentos/${p.id}`}>
                                <Card className="h-full transition-shadow hover:shadow-md">
                                  <CardHeader>
                                    <div className="flex items-start justify-between gap-2">
                                      <CardTitle className="text-base">{p.nome}</CardTitle>
                                      <Badge variant={statusVariant[s.id]}>{s.label}</Badge>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
                                    <p>Cliente: {p.clienteNome}</p>
                                  </CardContent>
                                </Card>
                              </Link>
                            ))}
                          </div>
                        )}
                      </TabsContent>
                    );
                  })}
                </Tabs>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
