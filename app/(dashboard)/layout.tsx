import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { podeUsarFavoritas, podeUsarTarefas } from "@/lib/recursos";
import { listObrasFavoritas } from "@/lib/store";
import { NavSidebar } from "@/components/nav-sidebar";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "cliente") redirect("/portal");

  const favoritas = podeUsarFavoritas(user) ? await listObrasFavoritas(user.id) : [];

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <div className="print:hidden">
        <NavSidebar userName={user.nome} isAdmin={user.role === "admin"} mostrarTarefas={podeUsarTarefas(user)}
          favoritas={favoritas.map((f) => ({ id: f.id, nome: f.nome }))}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra do topo (desktop): sino de notificações no canto direito. No
            celular o sino fica na barra do topo do menu. */}
        <div className="sticky top-0 z-30 hidden h-14 items-center justify-end gap-2 bg-background/90 px-8 backdrop-blur-sm md:flex print:hidden">
          <ThemeToggle />
          <NotificationBell />
        </div>
        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 md:pt-2 print:p-0">{children}</main>
      </div>
    </div>
  );
}
