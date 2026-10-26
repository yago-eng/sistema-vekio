// Agrupa arquivos por mês e, dentro do mês, por semana (segunda a domingo),
// do mais recente para o mais antigo — pela data de envio.

import type { Arquivo } from "./types";

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // volta pra segunda-feira
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function weekKey(d: Date) {
  return startOfWeek(d).toISOString().slice(0, 10);
}

function formatMonthLabel(iso: string) {
  const label = new Date(iso).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatWeekLabel(weekStartIso: string) {
  const start = new Date(weekStartIso + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `Semana de ${fmt(start)} a ${fmt(end)}`;
}

export type GrupoSemana = { chave: string; label: string; itens: Arquivo[] };
export type GrupoMes = { chave: string; label: string; semanas: GrupoSemana[] };

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
        }));
      return { chave: mesChave, label: formatMonthLabel(arquivosDoMes[0].createdAt), semanas };
    });
}
