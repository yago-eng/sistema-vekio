import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { limitarResponsaveis, podeUsarTarefas } from "@/lib/recursos";
import { listMembrosEquipe, listObras, listObrasFavoritas, listTarefas } from "@/lib/store";
import { TarefasPainel } from "@/components/tarefas-painel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Lock } from "lucide-react";

export default async function TarefasPage({
  searchParams,
}: {
  searchParams: Promise<{ tarefa?: string; aba?: string }>;
}) {
  const user = await requireUser();
  if (!podeUsarTarefas(user)) redirect("/inicio");
  const { tarefa, aba } = await searchParams;
  const ehAdmin = user.role === "admin";
  const [tarefas, pessoais, gestao, membros, obras, favoritas] = await Promise.all([
    listTarefas(),
    listTarefas({ pessoal: true }),
    ehAdmin ? listTarefas({ gestao: true }) : Promise.resolve([]),
    listMembrosEquipe(),
    listObras(),
    listObrasFavoritas(user.id),
  ]);

  // O link de um aviso (?tarefa=) abre a aba onde a tarefa está.
  const abaInicial =
    aba === "pessoais" || aba === "gestao"
      ? aba
      : gestao.some((t) => t.id === tarefa)
        ? "gestao"
        : pessoais.some((t) => t.id === tarefa)
          ? "pessoais"
          : "equipe";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Tarefas</h1>
        <p className="text-sm text-muted-foreground">
          Tarefas da empresa e das obras, com responsável, prazo, checklist e comentários.
        </p>
      </div>
      <Tabs key={abaInicial} defaultValue={abaInicial} className="flex flex-col gap-4">
        <TabsList>
          <TabsTrigger value="equipe">Tarefas</TabsTrigger>
          {ehAdmin && (
            <TabsTrigger value="gestao" className="gap-1.5">
              <Briefcase className="size-3.5" />
              Gestão
            </TabsTrigger>
          )}
          <TabsTrigger value="pessoais" className="gap-1.5">
            <Lock className="size-3.5" />
            Pessoais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="equipe">
          <TarefasPainel
            tarefas={tarefas}
            membros={limitarResponsaveis(membros)}
            obras={obras.map((o) => ({ id: o.id, nome: o.nome }))}
            usuarioId={user.id}
            isAdmin={user.role === "admin"}
            favoritas={favoritas.map((f) => ({ id: f.id, nome: f.nome }))}
            atalhoGestao={ehAdmin ? { abertas: gestao.filter((t) => t.status !== "concluida").length } : undefined}
            abrirId={abaInicial === "equipe" ? tarefa : undefined}
          />
        </TabsContent>

        {ehAdmin && (
          <TabsContent value="gestao" className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Tarefas da gestão da empresa, sem vínculo com obra. Só os administradores enxergam esta lista.
            </p>
            <TarefasPainel
              tarefas={gestao}
              membros={limitarResponsaveis(membros, { gestao: true })}
              obras={[]}
              usuarioId={user.id}
              isAdmin={ehAdmin}
              gestao
              abrirId={abaInicial === "gestao" ? tarefa : undefined}
            />
          </TabsContent>
        )}

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
            abrirId={abaInicial === "pessoais" ? tarefa : undefined}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
