"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarPlus, Check, CircleCheck, CircleDashed, Contrast, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { TAREFA_PRIORIDADES, type MembroEquipe, type TarefaPrioridade, type TarefaStatus } from "@/lib/types";

// --- Status: cada fase tem a sua cor (cinza = pendente, roxo = em andamento, verde = concluída) ---

export const ESTILO_STATUS: Record<TarefaStatus, { pill: string; icone: string; borda: string }> = {
  a_fazer: {
    pill: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
    icone: "text-slate-400",
    borda: "border-l-slate-300 dark:border-l-slate-600",
  },
  fazendo: {
    pill: "bg-violet-600 text-white",
    icone: "text-violet-500",
    borda: "border-l-violet-500",
  },
  concluida: {
    pill: "bg-emerald-600 text-white",
    icone: "text-emerald-500",
    borda: "border-l-emerald-500",
  },
};

export function IconeStatus({ status, className }: { status: TarefaStatus; className?: string }) {
  if (status === "concluida") return <CircleCheck className={className} />;
  if (status === "fazendo") return <Contrast className={className} />;
  return <CircleDashed className={className} />;
}

// --- Responsáveis: bolinhas com a inicial ---

const CORES_AVATAR = [
  "bg-red-500",
  "bg-violet-500",
  "bg-sky-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-indigo-500",
];

function corDe(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CORES_AVATAR[h % CORES_AVATAR.length];
}

export function Avatares({ responsaveis, max = 3 }: { responsaveis: MembroEquipe[]; max?: number }) {
  if (responsaveis.length === 0) return <span className="text-xs text-muted-foreground/60">—</span>;
  const visiveis = responsaveis.slice(0, max);
  const resto = responsaveis.length - visiveis.length;
  return (
    <div className="flex items-center -space-x-1.5" title={responsaveis.map((r) => r.nome).join(", ")}>
      {visiveis.map((r) => (
        <span
          key={r.id}
          className={cn(
            "flex size-6 items-center justify-center rounded-full text-[11px] font-semibold text-white ring-2 ring-background",
            corDe(r.id)
          )}
        >
          {(r.nome.trim()[0] ?? "?").toUpperCase()}
        </span>
      ))}
      {resto > 0 && (
        <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-background">
          +{resto}
        </span>
      )}
    </div>
  );
}

// --- Prazo ---

const DIAS_SEMANA = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

function diasAte(prazo: string, hoje: string) {
  const [y1, m1, d1] = hoje.split("-").map(Number);
  const [y2, m2, d2] = prazo.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

function somarDias(iso: string, dias: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function diaDaSemanaCurto(iso: string) {
  return DIAS_SEMANA[new Date(`${iso}T12:00:00Z`).getUTCDay()].slice(0, 3);
}

export function rotuloPrazo(prazo: string, hoje: string): string {
  const d = diasAte(prazo, hoje);
  if (d === 0) return "Hoje";
  if (d === 1) return "Amanhã";
  if (d === -1) return "Ontem";
  if (d > 1 && d <= 6) return DIAS_SEMANA[new Date(`${prazo}T12:00:00Z`).getUTCDay()];
  const [y, m, dia] = prazo.split("-");
  return `${dia}/${m}/${y.slice(2)}`;
}

// Clicar na data abre atalhos (hoje, amanhã...) e um calendário: dá para mudar sem abrir a edição.
export function PrazoRapido({
  prazo,
  hoje,
  concluida,
  onEscolher,
}: {
  prazo: string | null;
  hoje: string;
  concluida: boolean;
  onEscolher: (prazo: string | null) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const dias = prazo ? diasAte(prazo, hoje) : 0;
  const atrasada = !!prazo && !concluida && dias < 0;

  function escolher(valor: string | null) {
    setAberto(false);
    if (valor !== prazo) onEscolher(valor);
  }

  const atalhos: { rotulo: string; valor: string }[] = [
    { rotulo: "Hoje", valor: hoje },
    { rotulo: "Amanhã", valor: somarDias(hoje, 1) },
    { rotulo: "Próxima semana", valor: somarDias(hoje, 7) },
  ];

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm hover:bg-muted",
          !prazo && "text-muted-foreground/50",
          prazo && concluida && "text-muted-foreground",
          atrasada && "font-medium text-red-500",
          prazo && !concluida && dias === 0 && "font-medium text-amber-600 dark:text-amber-400"
        )}
        aria-label={prazo ? `Prazo: ${rotuloPrazo(prazo, hoje)}. Mudar` : "Definir prazo"}
        title={prazo ? "Mudar o prazo" : "Definir prazo"}
      >
        {prazo ? rotuloPrazo(prazo, hoje) : <CalendarPlus className="size-4" />}
      </PopoverTrigger>
      <PopoverContent className="w-60">
        <div className="flex flex-col">
          {atalhos.map((a) => (
            <button
              key={a.rotulo}
              type="button"
              onClick={() => escolher(a.valor)}
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted"
            >
              <span className="flex items-center gap-2">
                {prazo === a.valor && <Check className="size-3.5" />}
                {a.rotulo}
              </span>
              <span className="text-xs text-muted-foreground">
                {diaDaSemanaCurto(a.valor)} {a.valor.split("-").reverse().slice(0, 2).join("/")}
              </span>
            </button>
          ))}
          <div className="mt-1 border-t pt-2">
            <label className="flex flex-col gap-1 px-2 text-xs text-muted-foreground">
              Escolher outra data
              <input
                type="date"
                value={prazo ?? ""}
                onChange={(e) => e.target.value && escolher(e.target.value)}
                className="h-8 rounded-md border border-input bg-transparent px-2 text-base text-foreground sm:text-sm"
              />
            </label>
          </div>
          {prazo && (
            <button
              type="button"
              onClick={() => escolher(null)}
              className="mt-1 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted"
            >
              Sem data
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// --- Prioridade ---

export const COR_BANDEIRA: Record<string, string> = {
  urgente: "text-red-500",
  alta: "text-amber-500",
  normal: "text-blue-500",
  baixa: "text-slate-400",
};

export function PrioridadeRapida({
  prioridade,
  onEscolher,
}: {
  prioridade: TarefaPrioridade;
  onEscolher: (prioridade: TarefaPrioridade) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const rotulo = TAREFA_PRIORIDADES.find((p) => p.id === prioridade)?.label;

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger
        className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm hover:bg-muted"
        aria-label={`Prioridade: ${rotulo}. Mudar`}
        title="Mudar a prioridade"
      >
        <Flag className={cn("size-4 fill-current", COR_BANDEIRA[prioridade])} />
        {rotulo}
      </PopoverTrigger>
      <PopoverContent className="w-44">
        <div className="flex flex-col">
          {TAREFA_PRIORIDADES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setAberto(false);
                if (p.id !== prioridade) onEscolher(p.id);
              }}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
            >
              <Flag className={cn("size-4 fill-current", COR_BANDEIRA[p.id])} />
              {p.label}
              {p.id === prioridade && <Check className="ml-auto size-3.5" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
