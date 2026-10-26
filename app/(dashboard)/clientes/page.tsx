import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listTodosClientesComAcesso } from "@/lib/store";
import { ClientesGlobaisList } from "@/components/clientes-globais-list";

export default async function ClientesPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (currentUser.role !== "admin") redirect("/obras");

  const clientes = await listTodosClientesComAcesso();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Área do Cliente</h1>
        <p className="text-sm text-muted-foreground">
          Todos os clientes com acesso ao portal, as obras que cada um pode ver e quais abas ficam
          disponíveis pra eles. Para convidar um novo cliente, acesse a aba &quot;Cliente&quot; dentro
          da obra desejada.
        </p>
      </div>

      <ClientesGlobaisList clientes={clientes} />
    </div>
  );
}
