import { requireUser } from "@/lib/auth";
import { listObras, listCategorias } from "@/lib/store";
import { LancarGastoForm } from "@/components/lancar-gasto-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LancarGastoPage() {
  await requireUser();
  const [obras, categorias] = await Promise.all([listObras(), listCategorias()]);

  const obraOptions = obras.map((o) => ({ id: o.id, nome: o.nome, regiao: o.regiao }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Lançar gasto</h1>
        <p className="text-sm text-muted-foreground">
          Registre um gasto em qualquer obra — o valor entra na obra em tempo real.
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Novo gasto</CardTitle>
        </CardHeader>
        <CardContent>
          <LancarGastoForm obras={obraOptions} categorias={categorias} />
        </CardContent>
      </Card>
    </div>
  );
}
