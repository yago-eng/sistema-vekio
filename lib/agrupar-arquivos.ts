// Agrupa arquivos por mês e, dentro do mês, por semana (segunda a domingo) e
// por dia, do mais recente para o mais antigo — pela data de envio.
// As datas são sempre as de Brasília, rodando no servidor (UTC) ou no navegador.

import type { Arquivo } from "./types";

const FUSO = "America/Sao_Paulo";
const formatadorSP = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Date cujos campos locais (ano/mês/dia) são os de Brasília naquele instante.
function emSP(d: Date): Date {
  const [y, m, dia] = formatadorSP.format(d).split("-").map(Number);
  return new Date(y, m - 1, dia);
}

function startOfWeek(d: Date) {
  const date = emSP(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // volta pra segunda-feira
  date.setDate(date.getDate() + diff);
  return date;
}

function monthKey(d: Date) {
  const sp = emSP(d);
  return `${sp.getFullYear()}-${String(sp.getMonth() + 1).padStart(2, "0")}`;
}

function weekKey(d: Date) {
  const seg = startOfWeek(d);
  return `${seg.getFullYear()}-${String(seg.getMonth() + 1).padStart(2, "0")}-${String(seg.getDate()).padStart(2, "0")}`;
}

function formatMonthLabel(iso: string) {
  const label = emSP(new Date(iso)).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatWeekLabel(weekStartIso: string) {
  const start = new Date(weekStartIso + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `Semana de ${fmt(start)} a ${fmt(end)}`;
}

export type GrupoDia = { chave: string; label: string; itens: Arquivo[] };
export type GrupoSemana = { chave: string; label: string; itens: Arquivo[]; dias: GrupoDia[] };
export type GrupoMes = { chave: string; label: string; semanas: GrupoSemana[] };

function diaKey(d: Date) {
  return `${monthKey(d)}-${String(emSP(d).getDate()).padStart(2, "0")}`;
}

function formatDiaLabel(iso: string) {
  const d = emSP(new Date(iso));
  const diff = Math.round((emSP(new Date()).getTime() - d.getTime()) / 86_400_000);
  const data = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  if (diff === 0) return `Hoje · ${data}`;
  if (diff === 1) return `Ontem · ${data}`;
  const dia = d.toLocaleDateString("pt-BR", { weekday: "long" });
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} · ${data}`;
}

function agruparPorDia(itens: Arquivo[]): GrupoDia[] {
  const porDia = new Map<string, Arquivo[]>();
  for (const a of itens) {
    const dk = diaKey(new Date(a.createdAt));
    if (!porDia.has(dk)) porDia.set(dk, []);
    porDia.get(dk)!.push(a);
  }
  return Array.from(porDia.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([chave, doDia]) => ({ chave, label: formatDiaLabel(doDia[0].createdAt), itens: doDia }));
}

export function agruparPorMesESemana(itens: Arquivo[]): GrupoMes[] {
  const porMes = new Map<string, Arquivo[]>();
  for (const a of itens) {
    const mk = monthKey(new Date(a.createdAt));
    if (!porMes.has(mk)) porMes.set(mk, []);
    porMes.get(mk)!.push(a);
  }

  return Array.from(porMes.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([mesChave, arquivosDoMes]) => {
      const porSemana = new Map<string, Arquivo[]>();
      for (const a of arquivosDoMes) {
        const wk = weekKey(new Date(a.createdAt));
        if (!porSemana.has(wk)) porSemana.set(wk, []);
        porSemana.get(wk)!.push(a);
      }
      const semanas = Array.from(porSemana.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([semanaChave, arquivosDaSemana]) => ({
          chave: semanaChave,
          label: formatWeekLabel(semanaChave),
          itens: arquivosDaSemana.sort(
            (x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime()
          ),
        }))
        .map((sem) => ({ ...sem, dias: agruparPorDia(sem.itens) }));
      return { chave: mesChave, label: formatMonthLabel(arquivosDoMes[0].createdAt), semanas };
    });
}
