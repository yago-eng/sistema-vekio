import Link from "next/link";
import { listObras, listObrasFavoritas } from "@/lib/store";
import { podeUsarFavoritas } from "@/lib/recursos";
import { FavoritaBotao } from "@/components/favorita-botao";
import { Star } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { REGIOES } from "@/lib/types";
import { ObraFormDialog } from "@/components/obra-form-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const statusLabel: Record<string, string> = {
  planejamento: "Planejamento",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  pausada: "Pausada",
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function ObrasPage({
  searchParams,
}: {
  searchParams: Promise<{ regiao?: string; ano?: string }>;
}) {
  const { regiao: regiaoAtual, ano: anoAtual } = await searchParams;
  const obras = await listObras();
  const usuario = await getCurrentUser();
  const isAdmin = usuario?.role === "admin";
  const favoritasAtivas = !!usuario && podeUsarFavoritas(usuario);
  const favoritas = favoritasAtivas ? await listObrasFavoritas(usuario.id) : [];
  const idsFavoritas = new Set(favoritas.map((f) => f.id));

  const defaultRegiao =
    regiaoAtual && REGIOES.includes(regiaoAtual as (typeof REGIOES)[number])
      ? regiaoAtual
      : REGIOES[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Obras</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Financeiro de cada obra, atualizado a cada lançamento." : "Obras e lançamentos de gastos."}
          </p>
        </div>
        <ObraFormDialog isAdmin={isAdmin} />
      </div>

      {favoritas.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
            <Star className="size-4 fill-amber-400 text-amber-500" />
            Favoritas
          </span>
          {favoritas.map((f) => (
            <Link
              key={f.id}
              href={`/obras/${f.id}`}
              className="rounded-full border px-3 py-1 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              {f.nome}
            </Link>
          ))}
        </div>
      )}

      <Tabs defaultValue={defaultRegiao}>
        <TabsList>
          {REGIOES.map((r) => (
            <TabsTrigger key={r} value={r}>
              {r}
            </TabsTrigger>
          ))}
        </TabsList>

        {REGIOES.map((regiao) => {
          const obrasDaRegiao = obras.filter((o) => o.regiao === regiao);
          const anos = Array.from(new Set(obrasDaRegiao.map((o) => o.dataInicio.slice(0, 4)))).sort(
            (a, b) => Number(b) - Number(a)
          );
          const defaultAno =
            regiao === regiaoAtual && anoAtual && anos.includes(anoAtual) ? anoAtual : anos[0];

          return (
            <TabsContent key={regiao} value={regiao} className="flex flex-col gap-4">
              {obrasDaRegiao.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                    <p>Nenhuma obra cadastrada em {regiao} ainda.</p>
                    <p className="text-sm">Clique em &quot;Nova obra&quot; para começar.</p>
                  </CardContent>
                </Card>
              ) : (
                <Tabs defaultValue={defaultAno}>
                  <TabsList>
                    {anos.map((ano) => (
                      <TabsTrigger key={ano} value={ano}>
                        {ano}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {anos.map((ano) => {
                    const obrasDoAno = obrasDaRegiao.filter((o) => o.dataInicio.slice(0, 4) === ano);
                    const totalAno = obrasDoAno.reduce((sum, o) => sum + o.valorVenda, 0);
                    const aditivosAno = obrasDoAno.reduce((sum, o) => sum + o.valorAditivos, 0);
                    const voltarQuery = `voltarRegiao=${encodeURIComponent(regiao)}&voltarAno=${ano}`;
                    return (
                      <TabsContent key={ano} value={ano} className="flex flex-col gap-4">
                        <p className="text-sm text-muted-foreground">
                          {obrasDoAno.length} obra{obrasDoAno.length !== 1 ? "s" : ""}
                          {isAdmin && (
                            <>
                              {" "}
                              · {formatCurrency(totalAno)} em valor de venda
                              {aditivosAno > 0 && <> · {formatCurrency(aditivosAno)} em aditivos</>}
                            </>
                          )}
                        </p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {obrasDoAno.map((obra) => (
                            <div key={obra.id} className="relative">
                            <Link href={`/obras/${obra.id}?${voltarQuery}`}>
                              <Card className="h-full transition-shadow hover:shadow-md">
                                <CardHeader>
                                  <div className="flex items-start justify-between gap-2">
                                    <CardTitle className="text-base">{obra.nome}</CardTitle>
                                    <Badge variant="outline">{statusLabel[obra.status]}</Badge>
                                  </div>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
                                  <p>{obra.endereco}</p>
                                  <p>Cliente: {obra.clienteNome}</p>
                                  {isAdmin && (
                                    <p className="pt-2 font-medium text-foreground">
                                      Valor de venda: {formatCurrency(obra.valorVenda)}
                                    </p>
                                  )}
                                </CardContent>
                              </Card>
                            </Link>
                            {favoritasAtivas && (
                              <FavoritaBotao
                                obraId={obra.id}
                                favorita={idsFavoritas.has(obra.id)}
                                className="absolute right-2 bottom-2"
                              />
                            )}
                            </div>
                          ))}
                        </div>
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
