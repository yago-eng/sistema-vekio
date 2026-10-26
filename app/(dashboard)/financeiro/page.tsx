import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getFinanceiroGlobal, listCustosFixos, type FinanceiroAno } from "@/lib/store";
import { REGIOES } from "@/lib/types";
import { CustosFixosPanel } from "@/components/custos-fixos-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EvolucaoChart } from "@/components/evolucao-chart";
import { CategoriaChart } from "@/components/categoria-chart";
import { cn } from "@/lib/utils";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function anoLabel(ano: string) {
  return ano === "todos" ? "Todos os anos" : ano;
}

function FinanceiroAnoView({ dados }: { dados: FinanceiroAno }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Faturamento total
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCurrency(dados.faturamentoTotal + dados.aditivosTotal)}
            <p className="mt-1 text-xs font-normal text-muted-foreground">
              inclui {formatCurrency(dados.aditivosTotal)} em aditivos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total gasto em obras
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCurrency(dados.totalGastoGeral)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total gasto em custo fixo
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCurrency(dados.custoFixoTotal)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Margem total
            </CardTitle>
          </CardHeader>
          <CardContent
            className={cn(
              "text-2xl font-semibold",
              dados.margemTotal < 0 ? "text-destructive" : "text-foreground"
            )}
          >
            {formatCurrency(dados.margemTotal)}
            <p className="mt-1 text-xs font-normal text-muted-foreground">
              {dados.margemPercentualMedia.toFixed(1)}% margem média por obra
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Obras</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {dados.totalObras}
            <p className="mt-1 text-xs font-normal text-muted-foreground">
              {dados.obrasAtivas} em andamento
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Evolução mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <EvolucaoChart data={dados.porMes} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gastos por categoria (geral)</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoriaChart data={dados.porCategoria} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ranking de obras por margem</CardTitle>
        </CardHeader>
        <CardContent>
          {dados.rankingObras.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma obra cadastrada ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Obra</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead className="text-right">Valor de venda</TableHead>
                  <TableHead className="text-right">Aditivos</TableHead>
                  <TableHead className="text-right">Gasto</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                  <TableHead className="text-right">Margem %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dados.rankingObras.map((r) => (
                  <TableRow key={r.obraId}>
                    <TableCell className="font-medium">
                      <Link href={`/obras/${r.obraId}`} className="hover:underline">
                        {r.obraNome}
                      </Link>
                    </TableCell>
                    <TableCell>{r.regiao}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.valorVenda)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.valorAditivos)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.totalGasto)}</TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium",
                        r.margem < 0 && "text-destructive"
                      )}
                    >
                      {formatCurrency(r.margem)}
                    </TableCell>
                    <TableCell className="text-right">{r.margemPercentual.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default async function FinanceiroGlobalPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (currentUser.role !== "admin") redirect("/obras");

  const [dados, custos] = await Promise.all([getFinanceiroGlobal(), listCustosFixos()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Financeiro Global</h1>
        <p className="text-sm text-muted-foreground">
          Visão consolidada de faturamento, margem e crescimento de todas as obras.
        </p>
      </div>

      <Tabs defaultValue="visao">
        <TabsList>
          <TabsTrigger value="visao">Visão financeira</TabsTrigger>
          <TabsTrigger value="custos">Custos fixos</TabsTrigger>
        </TabsList>

        <TabsContent value="visao" className="pt-2">
          <Tabs defaultValue="geral">
            <TabsList>
              <TabsTrigger value="geral">Geral</TabsTrigger>
              {REGIOES.map((r) => (
                <TabsTrigger key={r} value={r}>
                  {r}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="geral">
              <Tabs defaultValue="todos">
                <TabsList>
                  {dados.anos.map((ano) => (
                    <TabsTrigger key={ano} value={ano}>
                      {anoLabel(ano)}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {dados.anos.map((ano) => (
                  <TabsContent key={ano} value={ano}>
                    <FinanceiroAnoView dados={dados.geral[ano]} />
                  </TabsContent>
                ))}
              </Tabs>
            </TabsContent>

            {REGIOES.map((regiao) => (
              <TabsContent key={regiao} value={regiao}>
                <Tabs defaultValue="todos">
                  <TabsList>
                    {dados.anos.map((ano) => (
                      <TabsTrigger key={ano} value={ano}>
                        {anoLabel(ano)}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {dados.anos.map((ano) => (
                    <TabsContent key={ano} value={ano}>
                      <FinanceiroAnoView dados={dados.porRegiaoAno[regiao][ano]} />
                    </TabsContent>
                  ))}
                </Tabs>
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        <TabsContent value="custos" className="pt-2">
          <CustosFixosPanel custos={custos} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
