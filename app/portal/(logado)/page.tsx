import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listObrasDoCliente } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export default async function PortalPage() {
  const user = await getCurrentUser();
  const obras = user ? await listObrasDoCliente(user.id) : [];

  if (obras.length === 1) redirect(`/portal/${obras[0].id}`);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Suas obras</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe fotos, relatórios, vídeos e o cronograma de cada obra.
        </p>
      </div>

      {obras.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhuma obra vinculada à sua conta ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {obras.map((obra) => (
            <Link key={obra.id} href={`/portal/${obra.id}`}>
              <Card className="h-full transition-colors hover:bg-muted/40">
                <CardHeader className="flex flex-row items-center gap-3">
                  <Building2 className="size-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-base">{obra.nome}</CardTitle>
                    <p className="text-xs text-muted-foreground">{obra.regiao}</p>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
