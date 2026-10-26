import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { DefinirSenhaCard } from "@/components/definir-senha-card";
import { InstalarAppCard } from "@/components/instalar-app-card";
import { LogOut } from "lucide-react";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "cliente") redirect("/obras");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-5 py-4 sm:px-8">
        <BrandLogo priority className="h-10 w-auto" />
        <div className="flex items-center gap-3">
          <p className="hidden text-sm text-muted-foreground sm:block">{user.nome}</p>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm" className="gap-2">
              <LogOut className="size-4" />
              Sair
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-5 sm:p-8">
        <div className="mx-auto mb-6 flex max-w-3xl flex-col gap-4">
          {!user.senhaDefinida && <DefinirSenhaCard />}
          <InstalarAppCard />
        </div>
        {children}
      </main>
    </div>
  );
}
