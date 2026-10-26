"use client";

import { useTransition } from "react";
import { deleteDataImportanteAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import type { DataImportante } from "@/lib/types";

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

function diaSeguro(ano: number, mes: number, dia: number) {
  const ultimoDia = new Date(ano, mes, 0).getDate();
  return new Date(ano, mes - 1, Math.min(dia, ultimoDia));
}

// Para datas recorrentes, calcula a próxima ocorrência (mesmo dia/mês, no ano
// atual ou no seguinte — o que estiver mais próximo à frente).
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

function diasRestantes(alvo: Date) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

export function DataImportanteList({ datas }: { datas: DataImportante[] }) {
  const [pending, startTransition] = useTransition();

  if (datas.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nenhuma data importante cadastrada ainda.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {datas.map((d) => {
        const alvo = proximaOcorrencia(d.data, d.recorrente);
        const dias = diasRestantes(alvo);
        const passou = dias < 0;
        const proximo = dias >= 0 && dias <= d.alertaDiasAntes;
        return (
          <div
            key={d.id}
            className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2"
          >
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="font-medium">{d.titulo}</span>
                {d.recorrente && (
                  <Badge variant="outline" className="text-[10px]">
                    Anual
                  </Badge>
                )}
                {passou ? (
                  <Badge variant="outline" className="text-muted-foreground">
                    passou
                  </Badge>
                ) : proximo ? (
                  <Badge variant="secondary" className="text-amber-700 dark:text-amber-500">
                    em {dias} {dias === 1 ? "dia" : "dias"}
                  </Badge>
                ) : (
                  <Badge variant="outline">em {dias} dias</Badge>
                )}
              </div>
              {d.descricao && <span className="text-sm text-muted-foreground">{d.descricao}</span>}
              <span className="text-xs text-muted-foreground">
                {d.recorrente
                  ? `Próxima: ${alvo.toLocaleDateString("pt-BR")} (todo dia ${formatDate(d.data).slice(0, 5)})`
                  : formatDate(d.data)}{" "}
                · alerta {d.alertaDiasAntes} dias antes
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => startTransition(() => deleteDataImportanteAction(d.id))}
            >
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
