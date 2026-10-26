import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listDatasImportantes } from "@/lib/store";
import { DataImportanteForm } from "@/components/data-importante-form";
import { DataImportanteList } from "@/components/data-importante-list";
import { DatasImportantesCalendar } from "@/components/datas-importantes-calendar";
import { TestarEmailButton } from "@/components/testar-email-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DatasImportantesPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (currentUser.role !== "admin") redirect("/obras");

  const datas = await listDatasImportantes();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Datas Importantes</h1>
          <p className="text-sm text-muted-foreground">
            Prazos e compromissos — você recebe um alerta por e-mail antes de cada data.
          </p>
        </div>
        <TestarEmailButton />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="h-fit lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Nova data</CardTitle>
          </CardHeader>
          <CardContent>
            <DataImportanteForm />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Próximas datas</CardTitle>
          </CardHeader>
          <CardContent>
            <DataImportanteList datas={datas} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Calendário</CardTitle>
        </CardHeader>
        <CardContent>
          <DatasImportantesCalendar datas={datas} />
        </CardContent>
      </Card>
    </div>
  );
}
