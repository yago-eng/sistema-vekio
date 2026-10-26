import { requireUser } from "@/lib/auth";
import { listLembretes } from "@/lib/store";
import { LembreteForm } from "@/components/lembrete-form";
import { LembreteCard } from "@/components/lembrete-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LembretesPage() {
  const user = await requireUser();
  const lembretes = await listLembretes(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Lembretes e Notas</h1>
        <p className="text-sm text-muted-foreground">
          Seu espaço pessoal de anotações — visível apenas para você.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-base">Nova nota</CardTitle>
          </CardHeader>
          <CardContent>
            <LembreteForm />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 lg:col-span-2">
          {lembretes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Você ainda não tem nenhuma nota. Crie a primeira ao lado.
              </CardContent>
            </Card>
          ) : (
            lembretes.map((l) => <LembreteCard key={l.id} lembrete={l} />)
          )}
        </div>
      </div>
    </div>
  );
}
