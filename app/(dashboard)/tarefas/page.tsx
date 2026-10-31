import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { limitarResponsaveis, podeUsarTarefas } from "@/lib/recursos";
import { listMembrosEquipe, listObras, listObrasFavoritas, listTarefas } from "@/lib/store";
import { TarefasPainel } from "@/components/tarefas-painel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock } from "lucide-react";

export default async function TarefasPage({
  searchParams,
}: {
  searchParams: Promise<{ tarefa?: string; aba?: string }>;
}) {
  const user = await requireUser();
  if (!podeUsarTarefas(user)) redirect("/inicio");
  const { tarefa, aba } = await searchParams;
  const [tarefas, pessoais, membros, obras, favoritas] = await Promise.all([
    listTarefas(),
    listTarefas({ pessoal: true }),
    listMembrosEquipe(),
    listObras(),
    listObrasFavoritas(user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Tarefas</h1>
        <p className="text-sm text-muted-foreground">
          Tarefas da empresa e das obras, com responsável, prazo, checklist e comentários.
        </p>
      </div>
      <Tabs defaultValue={aba === "pessoais" ? "pessoais" : "equipe"} className="flex flex-col gap-4">
        <TabsList>
          <TabsTrigger value="equipe">Tarefas</TabsTrigger>
          <TabsTrigger value="pessoais" className="gap-1.5">
            <Lock className="size-3.5" />
            Pessoais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="equipe">
          <TarefasPainel
            tarefas={tarefas}
            membros={limitarResponsaveis(membros, user)}
            obras={obras.map((o) => ({ id: o.id, nome: o.nome }))}
            usuarioId={user.id}
            isAdmin={user.role === "admin"}
            favoritas={favoritas.map((f) => ({ id: f.id, nome: f.nome }))}
            abrirId={tarefa}
          />
        </TabsContent>

        <TabsContent value="pessoais" className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Sua lista particular: só você vê estas tarefas, nem os administradores.
          </p>
          <TarefasPainel
            tarefas={pessoais}
            membros={[]}
            obras={[]}
            usuarioId={user.id}
            isAdmin={false}
            pessoal
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
