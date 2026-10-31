import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listDatasImportantes, listObrasFavoritas, listTarefas, listarObrasRecentes } from "@/lib/store";
import { podeUsarFavoritas, podeUsarTarefas } from "@/lib/recursos";
import { MinhasTarefasHoje } from "@/components/minhas-tarefas-hoje";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  LineChart,
  ClipboardList,
  StickyNote,
  Receipt,
  CalendarClock,
  CalendarHeart,
  Users,
  ArrowRight,
  MapPin,
  Star,
} from "lucide-react";

const statusObra: Record<string, string> = {
  planejamento: "Planejamento",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  pausada: "Pausada",
};

function saudacao() {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

function primeiroNome(nome: string) {
  return nome.trim().split(" ")[0];
}

function diaSeguro(ano: number, mes: number, dia: number) {
  const ultimoDia = new Date(ano, mes, 0).getDate();
  return new Date(ano, mes - 1, Math.min(dia, ultimoDia));
}

function proximaOcorrencia(iso: string, recorrente: boolean) {
  const original = new Date(iso + "T00:00:00");
  if (!recorrente) return original;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const mes = original.getMonth() + 1;
  const dia = original.getDate();
  const nesteAno = diaSeguro(hoje.getFullYear(), mes, dia);
  return nesteAno < hoje ? diaSeguro(hoje.getFullYear() + 1, mes, dia) : nesteAno;
}

const acoesPrincipais = [
  { href: "/lancar-gasto", label: "Lançar gasto", desc: "Registrar um gasto de obra", icon: Receipt },
  { href: "/obras", label: "Obras & Financeiro", desc: "Ver e gerenciar obras", icon: Building2 },
  { href: "/lembretes", label: "Lembretes e Notas", desc: "Suas anotações privadas", icon: StickyNote },
];

const acoesAdmin = [
  { href: "/financeiro", label: "Financeiro Global", desc: "Faturamento e margem da empresa", icon: LineChart },
  { href: "/fluxo-caixa", label: "Fluxo de Caixa", desc: "Entradas e saídas previstas", icon: CalendarClock },
  { href: "/orcamentos", label: "Orçamentos", desc: "Propostas e precificação", icon: ClipboardList },
  { href: "/datas-importantes", label: "Datas Importantes", desc: "Prazos e compromissos", icon: CalendarHeart },
  { href: "/clientes", label: "Área do Cliente", desc: "Acessos e abas visíveis por cliente", icon: Users },
];

export default async function InicioPage() {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";

  const obrasRecentes = user ? await listarObrasRecentes(user.id) : [];
  const hojeSP = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const tarefasDoDia =
    user && podeUsarTarefas(user)
      ? [...(await listTarefas()), ...(user.role === "admin" ? await listTarefas({ gestao: true }) : [])]
          .filter(
            (t) =>
              t.status !== "concluida" &&
              t.responsaveis.some((r) => r.id === user.id) &&
              (t.status === "fazendo" || (!!t.prazo && t.prazo <= hojeSP))
          )
          .sort(
            (a, b) =>
              (a.prazo ?? "9999").localeCompare(b.prazo ?? "9999") || a.titulo.localeCompare(b.titulo)
          )
      : null;
  const favoritas = user && podeUsarFavoritas(user) ? await listObrasFavoritas(user.id) : [];
  const datas = isAdmin ? await listDatasImportantes() : [];
  const hojeIso = new Date().toISOString().slice(0, 10);
  const proximasDatas = datas
    .map((d) => ({ ...d, ocorrencia: proximaOcorrencia(d.data, d.recorrente) }))
    .filter((d) => d.recorrente || d.data >= hojeIso)
    .sort((a, b) => a.ocorrencia.getTime() - b.ocorrencia.getTime())
    .slice(0, 4);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div>
        <p className="text-sm font-medium tracking-wide text-primary uppercase">
          {saudacao()}, {primeiroNome(user?.nome ?? "")}
        </p>
        <h1 className="mt-1 text-3xl font-semibold">O que vamos fazer hoje?</h1>
      </div>

      {tarefasDoDia && <MinhasTarefasHoje tarefas={tarefasDoDia.slice(0, 8)} hoje={hojeSP} total={tarefasDoDia.length} />}

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Acesso rápido</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {acoesPrincipais.map((a) => (
            <Link key={a.href} href={a.href} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/40 group-hover:bg-primary/5">
                <CardContent className="flex items-start gap-3 pt-6">
                  <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                    <a.icon className="size-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{a.label}</p>
                    <p className="text-sm text-muted-foreground">{a.desc}</p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {favoritas.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Star className="size-4 fill-amber-400 text-amber-500" />
            Obras favoritas
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {favoritas.map((o) => (
              <Link key={o.id} href={`/obras/${o.id}`} className="group">
                <Card className="h-full transition-colors group-hover:border-primary/40 group-hover:bg-primary/5">
                  <CardContent className="flex flex-col gap-2 pt-6">
                    <p className="font-medium">{o.nome}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" />
                      {o.regiao}
                    </p>
                    <Badge variant="outline" className="w-fit">
                      {statusObra[o.status] ?? o.status}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {obrasRecentes.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Obras recentes</h2>
            <Link href="/obras" className="text-xs text-muted-foreground underline hover:text-foreground">
              Ver todas
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {obrasRecentes.map((o) => (
              <Link key={o.id} href={`/obras/${o.id}`} className="group">
                <Card className="h-full transition-colors group-hover:border-primary/40 group-hover:bg-primary/5">
                  <CardContent className="flex flex-col gap-2 pt-6">
                    <p className="font-medium">{o.nome}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" />
                      {o.regiao}
                    </p>
                    <Badge variant="outline" className="w-fit">
                      {statusObra[o.status] ?? o.status}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {isAdmin && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Gestão</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {acoesAdmin.map((a) => (
              <Link key={a.href} href={a.href} className="group">
                <Card className="h-full transition-colors group-hover:border-primary/40 group-hover:bg-primary/5">
                  <CardContent className="flex items-start gap-3 pt-6">
                    <div className="rounded-lg bg-muted p-2.5 text-foreground">
                      <a.icon className="size-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{a.label}</p>
                      <p className="text-sm text-muted-foreground">{a.desc}</p>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {isAdmin && proximasDatas.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Próximas datas importantes</h2>
          <Card>
            <CardContent className="flex flex-col divide-y pt-2">
              {proximasDatas.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 py-3 first:pt-4 last:pb-4">
                  <div>
                    <p className="text-sm font-medium">{d.titulo}</p>
                    {d.descricao && <p className="text-xs text-muted-foreground">{d.descricao}</p>}
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {d.ocorrencia.toLocaleDateString("pt-BR")}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
