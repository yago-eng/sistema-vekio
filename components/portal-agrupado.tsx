import { agruparPorMesESemana } from "@/lib/agrupar-arquivos";
import type { Arquivo } from "@/lib/types";

// Mês > semana > dia, do mais recente pro mais antigo. Cada dia recebe seus
// arquivos pra desenhar do jeito que a lista precisar (grade, lista, vídeo).
export function AgrupadoPorMesSemanaDia({
  itens,
  children,
}: {
  itens: Arquivo[];
  children: (itensDoDia: Arquivo[]) => React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      {agruparPorMesESemana(itens).map((mes) => (
        <div key={mes.chave} className="flex flex-col gap-4">
          <h4 className="text-sm font-bold">{mes.label}</h4>
          {mes.semanas.map((semana) => (
            <div key={semana.chave} className="flex flex-col gap-3">
              <p className="text-xs font-medium text-muted-foreground">{semana.label}</p>
              {semana.dias.map((dia) => (
                <div key={dia.chave} className="flex flex-col gap-2">
                  <p className="text-xs font-semibold">{dia.label}</p>
                  {children(dia.itens)}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
