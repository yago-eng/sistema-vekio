"use client";

import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Categoria } from "@/lib/types";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function inicioDaSemana(d: Date) {
  const dia = d.getDay();
  const diff = dia === 0 ? -6 : 1 - dia; // segunda-feira
  const inicio = new Date(d);
  inicio.setDate(d.getDate() + diff);
  return inicio;
}

export function RelatorioFiltro({
  inicio,
  fim,
  categoriaId,
  categorias,
}: {
  inicio?: string;
  fim?: string;
  categoriaId?: string;
  categorias: Categoria[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  function aplicar(novoInicio: string, novoFim: string, novaCategoriaId: string) {
    const params = new URLSearchParams();
    if (novoInicio) params.set("inicio", novoInicio);
    if (novoFim) params.set("fim", novoFim);
    if (novaCategoriaId) params.set("categoriaId", novaCategoriaId);
    router.push(params.toString() ? `${pathname}?${params}` : pathname);
  }

  function semanaAtual() {
    const hoje = new Date();
    const ini = inicioDaSemana(hoje);
    const f = new Date(ini);
    f.setDate(ini.getDate() + 6);
    aplicar(isoDate(ini), isoDate(f), categoriaId ?? "");
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border p-3 text-sm print:hidden">
      <div className="flex flex-col gap-1">
        <Label htmlFor="inicio" className="text-xs">De</Label>
        <Input
          id="inicio"
          type="date"
          defaultValue={inicio ?? ""}
          className="h-8"
          onChange={(e) => aplicar(e.target.value, fim ?? "", categoriaId ?? "")}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="fim" className="text-xs">Até</Label>
        <Input
          id="fim"
          type="date"
          defaultValue={fim ?? ""}
          className="h-8"
          onChange={(e) => aplicar(inicio ?? "", e.target.value, categoriaId ?? "")}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="categoriaFiltro" className="text-xs">Etapa / categoria</Label>
        <Select
          value={categoriaId || "todas"}
          onValueChange={(value) =>
            aplicar(inicio ?? "", fim ?? "", value === "todas" ? "" : (value as string))
          }
          items={{
            todas: "Todas as categorias",
            ...Object.fromEntries(categorias.map((c) => [c.id, c.nome])),
          }}
        >
          <SelectTrigger id="categoriaFiltro" className="h-8 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={semanaAtual}>
        Semana atual
      </Button>
      {(inicio || fim || categoriaId) && (
        <Button type="button" variant="ghost" size="sm" onClick={() => aplicar("", "", "")}>
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
