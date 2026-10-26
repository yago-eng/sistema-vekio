import type { RelatorioObra } from "@/lib/types";

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function PortalRelatorioObra({ relatorios }: { relatorios: RelatorioObra[] }) {
  if (relatorios.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhum relatório publicado ainda.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {relatorios.map((r) => (
        <div key={r.id} className="rounded-lg border p-4">
          <p className="text-sm font-semibold">{formatDate(r.data)}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{r.texto}</p>
        </div>
      ))}
    </div>
  );
}
