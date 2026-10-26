import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listPagamentosGlobais, listLancamentosGlobais, listCustosFixosGlobais } from "@/lib/store";
import { REGIOES } from "@/lib/types";
import { FluxoCaixaCalendar } from "@/components/fluxo-caixa-calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function FluxoCaixaPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (currentUser.role !== "admin") redirect("/obras");

  const [pagamentos, lancamentos, custosFixos] = await Promise.all([
    listPagamentosGlobais(),
    listLancamentosGlobais(),
    listCustosFixosGlobais(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Fluxo de Caixa</h1>
        <p className="text-sm text-muted-foreground">
          Calendário e saldo projetado — entradas de clientes vs. saídas de obras e custos fixos.
        </p>
      </div>

      <Tabs defaultValue="todas">
        <TabsList>
          <TabsTrigger value="todas">Todas as sedes</TabsTrigger>
          {REGIOES.map((r) => (
            <TabsTrigger key={r} value={r}>
              {r}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="todas" className="pt-2">
          <FluxoCaixaCalendar
            pagamentos={pagamentos}
            lancamentos={lancamentos}
            custosFixos={custosFixos}
          />
        </TabsContent>

        {REGIOES.map((regiao) => (
          <TabsContent key={regiao} value={regiao} className="pt-2">
            <FluxoCaixaCalendar
              pagamentos={pagamentos.filter((p) => p.regiao === regiao)}
              lancamentos={lancamentos.filter((l) => l.regiao === regiao)}
              custosFixos={custosFixos.filter((c) => c.regiao === regiao)}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
