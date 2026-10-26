import { notFound } from "next/navigation";
import { getObra, listEtapas } from "@/lib/store";
import { PrintButton } from "@/components/print-button";

function parseDate(iso: string) {
  return new Date(iso + "T00:00:00");
}

function diffDays(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

function formatDate(iso: string) {
  return parseDate(iso).toLocaleDateString("pt-BR");
}

function monthLabel(d: Date) {
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
}

export default async function RelatorioCronogramaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const obra = await getObra(id);
  if (!obra) notFound();

  const etapas = await listEtapas(id);

  let months: { label: string; widthPct: number }[] = [];
  let rangeStart: Date | null = null;
  let totalDays = 1;

  if (etapas.length > 0) {
    rangeStart = parseDate(
      etapas.reduce((min, e) => (e.dataInicio < min ? e.dataInicio : min), etapas[0].dataInicio)
    );
    const rangeEnd = parseDate(
      etapas.reduce((max, e) => (e.dataFim > max ? e.dataFim : max), etapas[0].dataFim)
    );
    totalDays = Math.max(diffDays(rangeEnd, rangeStart) + 1, 1);

    let cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    while (cursor <= rangeEnd) {
      const monthStart = cursor < rangeStart ? rangeStart : cursor;
      const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const monthEnd = nextMonth > rangeEnd ? rangeEnd : new Date(nextMonth.getTime() - 86_400_000);
      const days = diffDays(monthEnd, monthStart) + 1;
      months.push({ label: monthLabel(cursor), widthPct: (days / totalDays) * 100 });
      cursor = nextMonth;
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6 print:p-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Cronograma — {obra.nome}</h1>
          <p className="text-sm text-muted-foreground">
            {obra.endereco} · Cliente: {obra.clienteNome} · {obra.regiao}
          </p>
          <p className="text-xs text-muted-foreground">
            Gerado em {new Date().toLocaleDateString("pt-BR")}
          </p>
        </div>
        <PrintButton />
      </div>

      {etapas.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nenhuma etapa cadastrada nesta obra ainda.
        </p>
      ) : (
        <div className="flex flex-col overflow-hidden rounded-lg border break-inside-avoid">
          {/* Cabeçalho */}
          <div className="flex bg-[#424431] text-[#faf9f6]">
            <div className="w-44 shrink-0 border-r border-white/15 px-3 py-2 text-xs font-semibold uppercase tracking-wide">
              Etapa
            </div>
            <div className="w-24 shrink-0 border-r border-white/15 px-2 py-2 text-xs font-semibold uppercase tracking-wide">
              Início
            </div>
            <div className="w-24 shrink-0 border-r border-white/15 px-2 py-2 text-xs font-semibold uppercase tracking-wide">
              Fim
            </div>
            <div className="flex flex-1">
              {months.map((m, i) => (
                <div
                  key={i}
                  style={{ width: `${m.widthPct}%` }}
                  className="border-r border-white/15 px-2 py-2 text-center text-xs font-semibold capitalize last:border-r-0"
                >
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {/* Linhas */}
          {etapas.map((etapa, i) => {
            const offsetDays = diffDays(parseDate(etapa.dataInicio), rangeStart!);
            const durationDays = diffDays(parseDate(etapa.dataFim), parseDate(etapa.dataInicio)) + 1;
            const leftPct = (offsetDays / totalDays) * 100;
            const widthPct = Math.max((durationDays / totalDays) * 100, 2);

            return (
              <div
                key={etapa.id}
                className={`flex items-stretch border-t break-inside-avoid ${i % 2 === 1 ? "bg-[#f0eee7]/50" : ""}`}
              >
                <div className="w-44 shrink-0 border-r px-3 py-2">
                  <p className="truncate text-sm font-medium">{etapa.nome}</p>
                </div>
                <div className="flex w-24 shrink-0 items-center border-r px-2 py-2 text-xs text-muted-foreground">
                  {formatDate(etapa.dataInicio)}
                </div>
                <div className="flex w-24 shrink-0 items-center border-r px-2 py-2 text-xs text-muted-foreground">
                  {formatDate(etapa.dataFim)}
                </div>
                <div className="relative flex-1 py-2">
                  {months.map((_, mi) => (
                    <div
                      key={mi}
                      className="absolute top-0 bottom-0 border-r last:border-r-0"
                      style={{
                        left: `${months.slice(0, mi).reduce((s, m) => s + m.widthPct, 0)}%`,
                        width: `${months[mi].widthPct}%`,
                      }}
                    />
                  ))}
                  <div
                    className="absolute top-1/2 h-5 -translate-y-1/2 overflow-hidden rounded-full bg-[#e3ded2] ring-1 ring-[#424431]/15"
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  >
                    <div
                      className="h-full rounded-full bg-[#424431]"
                      style={{ width: `${etapa.progresso}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {etapas.length > 0 && (
        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="inline-block size-3 rounded-full bg-[#e3ded2] ring-1 ring-[#424431]/15" />
            Período previsto
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block size-3 rounded-full bg-[#424431]" />
            Progresso concluído
          </div>
        </div>
      )}
    </div>
  );
}
