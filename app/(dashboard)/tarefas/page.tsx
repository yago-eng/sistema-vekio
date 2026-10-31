import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { limitarResponsaveis, podeUsarTarefas } from "@/lib/recursos";
import { listMembrosEquipe, listObras, listTarefas } from "@/lib/store";
import { TarefasPainel } from "@/components/tarefas-painel";

export default async function TarefasPage({
  searchParams,
}: {
  searchParams: Promise<{ tarefa?: string }>;
}) {
  const user = await requireUser();
  if (!podeUsarTarefas(user)) redirect("/inicio");
  const { tarefa } = await searchParams;
  const [tarefas, membros, obras] = await Promise.all([listTarefas(), listMembrosEquipe(), listObras()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Tarefas</h1>
        <p className="text-sm text-muted-foreground">
          Tarefas da empresa e das obras, com responsável, prazo, checklist e comentários.
        </p>
      </div>
      <TarefasPainel
        tarefas={tarefas}
        membros={limitarResponsaveis(membros, user)}
        obras={obras.map((o) => ({ id: o.id, nome: o.nome }))}
        usuarioId={user.id}
        isAdmin={user.role === "admin"}
        abrirId={tarefa}
      />
    </div>
  );
}
