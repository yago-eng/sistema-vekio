"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/actions";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Building2, CheckSquare, LineChart, LogOut, ClipboardList, StickyNote, Receipt, CalendarClock, CalendarHeart, Users, Menu, X, Home, Star } from "lucide-react";

const inicioItem = { href: "/inicio", label: "Início", icon: Home, active: true };
const tarefasItem = { href: "/tarefas", label: "Tarefas", icon: CheckSquare, active: true };
const obrasItem = { href: "/obras", label: "Obras & Financeiro", icon: Building2, active: true };
const lancarGastoItem = { href: "/lancar-gasto", label: "Lançar gasto", icon: Receipt, active: true };
const adminItems = [
  { href: "/financeiro", label: "Financeiro Global", icon: LineChart, active: true },
  { href: "/fluxo-caixa", label: "Fluxo de Caixa", icon: CalendarClock, active: true },
  { href: "/orcamentos", label: "Orçamentos", icon: ClipboardList, active: true },
  { href: "/datas-importantes", label: "Datas Importantes", icon: CalendarHeart, active: true },
  { href: "/clientes", label: "Área do Cliente", icon: Users, active: true },
];
const lembretesItem = { href: "/lembretes", label: "Lembretes e Notas", icon: StickyNote, active: true };

type NavItem = { href: string; label: string; icon: typeof Building2; active: boolean };

function NavLinks({ items, pathname, onNavigate }: { items: NavItem[]; pathname: string; onNavigate?: () => void }) {
  return (
    <>
      {items.map((item) => {
        const isCurrent = item.active && pathname.startsWith(item.href);
        const Icon = item.icon;
        if (!item.active) {
          return (
            <div
              key={item.label}
              className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground/60"
            >
              <span className="flex items-center gap-2">
                <Icon className="size-4" />
                {item.label}
              </span>
              <Badge variant="secondary" className="text-[10px]">
                Em breve
              </Badge>
            </div>
          );
        }
        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
              isCurrent && "bg-muted text-foreground"
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

function FavoritasLinks({ favoritas, pathname, onNavigate }: { favoritas: { id: string; nome: string }[]; pathname: string; onNavigate?: () => void }) {
  if (favoritas.length === 0) return null;
  return (
    <div className="mt-3 flex flex-col gap-1 border-t pt-3">
      <p className="flex items-center gap-1.5 px-3 pb-1 text-xs font-medium text-muted-foreground">
        <Star className="size-3.5 fill-amber-400 text-amber-500" />
        Obras favoritas
      </p>
      {favoritas.map((f) => (
        <Link
          key={f.id}
          href={`/obras/${f.id}`}
          onClick={onNavigate}
          className={cn(
            "truncate rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-muted",
            pathname.startsWith(`/obras/${f.id}`) && "bg-muted font-medium"
          )}
        >
          {f.nome}
        </Link>
      ))}
    </div>
  );
}

export function NavSidebar({
  userName,
  isAdmin,
  mostrarTarefas,
  favoritas,
}: {
  userName: string;
  isAdmin: boolean;
  mostrarTarefas: boolean;
  favoritas: { id: string; nome: string }[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = [
    inicioItem,
    ...(mostrarTarefas ? [tarefasItem] : []),
    lancarGastoItem,
    obrasItem,
    ...(isAdmin ? adminItems : []),
    lembretesItem,
  ];

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b bg-background px-4 py-3 md:hidden">
        <BrandLogo priority className="h-8 w-auto" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <NotificationBell mostrarAbaTarefas={mostrarTarefas} />
          <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)} aria-label="Abrir menu">
            <Menu className="size-5" />
          </Button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-background shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <BrandLogo className="h-10 w-auto" />
              <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="Fechar menu">
                <X className="size-5" />
              </Button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
              <NavLinks items={items} pathname={pathname} onNavigate={() => setOpen(false)} />
              <FavoritasLinks favoritas={favoritas} pathname={pathname} onNavigate={() => setOpen(false)} />
            </nav>
            <div className="border-t p-3">
              <p className="truncate px-3 pb-2 text-xs text-muted-foreground">{userName}</p>
              <form action={logoutAction}>
                <Button type="submit" variant="ghost" size="sm" className="w-full justify-start gap-2">
                  <LogOut className="size-4" />
                  Sair
                </Button>
              </form>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden h-screen w-64 flex-col border-r bg-background md:flex">
        <div className="border-b px-5 py-6">
          <BrandLogo priority className="h-16 w-auto" />
          <p className="mt-2 text-[9px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Sistema de gestão
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          <NavLinks items={items} pathname={pathname} />
          <FavoritasLinks favoritas={favoritas} pathname={pathname} />
        </nav>

        <div className="border-t p-3">
          <p className="truncate px-3 pb-2 text-xs text-muted-foreground">{userName}</p>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm" className="w-full justify-start gap-2">
              <LogOut className="size-4" />
              Sair
            </Button>
          </form>
        </div>
      </aside>
    </>
  );
}
