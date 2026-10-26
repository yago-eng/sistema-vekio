"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { updateOrcamentoEscopoAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Save, X } from "lucide-react";
import type { OrcamentoEscopo } from "@/lib/types";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const INCLUSO = [
  "Toda a mão de obra para a execução dos serviços citados no escopo acima.",
  "Todo o material para infraestrutura elétrica, como: eletrodutos e fiação.",
  "Todo o material para a infraestrutura hidráulica e esgotamento sanitário, como: tubulações e conexões.",
  "Todo o material para o forro e as paredes de drywall.",
  "Todo o material para a pintura, como: selador, massa corrida, tinta branca e tinta colorida.",
  "Todo o insumo grosso para as demais instalações, como: areia, cimento, tijolos, impermeabilizante e afins.",
  "A emissão de anotação de responsabilidade técnica (ART) e seguro de obra.",
];

const NAO_INCLUSO = [
  "Os itens de acabamentos elétricos como: spots, luminárias, interruptores, tomadas e afins.",
  "Os itens de acabamentos hidráulicos como: sanitários, torneiras, chuveiros, ralos lineares, ralos ocultos, bases monocomando, acabamentos de registros e afins.",
  "Os itens de acabamento gerais como piso porcelanato, piso vinílico, papel de parede e pedra da escada, e os respectivos materiais para instalação, como: argamassa colante, autonivelante, primer, cola, rejuntes, perfis de acabamento e afins.",
  "Itens gerais de acabamento como: rodapés, mármores, portas de marcenaria, esquadrias e afins.",
  "Os equipamentos de climatização e eletrodomésticos (fornos, cooktop, coifa, lava-louças, refrigerador, cervejeira e afins).",
  "Os acessórios para instalação de eletros, metais e acabamentos, como: suportes, sifões, flexíveis, válvulas e afins.",
  "O fechamento de sacadas, cobertura retrátil e envidraçamento.",
];

type EtapaEdit = { nome: string; itensText: string };

function toEtapaEdit(escopo: OrcamentoEscopo): EtapaEdit[] {
  return escopo.etapas.map((e) => ({
    nome: e.nome,
    itensText: e.itens.join("\n"),
  }));
}

function SectionBar({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "investimento";
}) {
  return (
    <div
      className="break-inside-avoid px-4 py-2.5 text-center text-sm font-bold tracking-[0.12em] uppercase"
      style={
        variant === "investimento"
          ? { backgroundColor: "#595c47", color: "#ebe8e3" }
          : { backgroundColor: "#ebe8e3", color: "#434532" }
      }
    >
      {children}
    </div>
  );
}

export function EscopoEditor({
  obraId,
  orcamentoId,
  escopo,
  obraNome,
  clienteNome,
  endereco,
}: {
  obraId: string;
  orcamentoId: string;
  escopo: OrcamentoEscopo;
  obraNome: string;
  clienteNome: string;
  endereco: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [etapas, setEtapas] = useState<EtapaEdit[]>(() => toEtapaEdit(escopo));
  const [prazoEstimado, setPrazoEstimado] = useState(escopo.prazoEstimado ?? "");
  const [valorObra, setValorObra] = useState(String(escopo.valorObra));
  const [tributacao, setTributacao] = useState(String(escopo.tributacao));
  const [totalComTributacao, setTotalComTributacao] = useState(String(escopo.totalComTributacao));

  function cancelar() {
    setEtapas(toEtapaEdit(escopo));
    setPrazoEstimado(escopo.prazoEstimado ?? "");
    setValorObra(String(escopo.valorObra));
    setTributacao(String(escopo.tributacao));
    setTotalComTributacao(String(escopo.totalComTributacao));
    setError(null);
    setEditing(false);
  }

  function salvar() {
    setError(null);
    startTransition(async () => {
      const res = await updateOrcamentoEscopoAction(obraId, orcamentoId, {
        etapas: etapas.map((e) => ({
          nome: e.nome,
          itens: e.itensText
            .split("\n")
            .map((i) => i.trim())
            .filter(Boolean),
        })),
        prazoEstimado: prazoEstimado.trim() || null,
        condicoes: escopo.condicoes,
        valorObra: Number(valorObra) || 0,
        tributacao: Number(tributacao) || 0,
        totalComTributacao: Number(totalComTributacao) || 0,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex w-full max-w-[210mm] items-center justify-between gap-2 px-2 print:hidden">
        <p className="text-xs text-muted-foreground">
          {editing ? "Editando o escopo gerado pela IA." : "Você pode editar o texto do escopo."}
        </p>
        {editing ? (
          <div className="flex items-center gap-2">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={cancelar} disabled={isPending}>
              <X className="size-4" />
              Cancelar
            </Button>
            <Button type="button" size="sm" className="gap-2" onClick={salvar} disabled={isPending}>
              <Save className="size-4" />
              {isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setEditing(true)}>
            <Pencil className="size-4" />
            Editar escopo
          </Button>
        )}
      </div>

      {/* Conteúdo do escopo */}
      <div className="flex w-full max-w-[210mm] flex-col gap-6 bg-white p-[12mm] shadow-md print:shadow-none">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-24 w-20 shrink-0 items-center justify-center" style={{ backgroundColor: "#434532" }}>
            <Image
              src="/brand/logo-stacked-branco.png"
              alt="Vekio Engenharia"
              width={91}
              height={80}
              unoptimized
              className="block h-14 w-auto"
            />
          </div>
          <div className="text-right" style={{ color: "#646463" }}>
            <h1
              className="text-[2.1rem] leading-tight tracking-[0.02em]"
              style={{ color: "#434532" }}
            >
              ORÇAMENTO
            </h1>
            <p className="text-base">{new Date(escopo.geradoEm).toLocaleDateString("pt-BR")}</p>
            <p className="text-base font-bold" style={{ color: "#434532" }}>
              {clienteNome}
            </p>
            <p className="text-base">{obraNome}</p>
            <p className="text-base">{endereco}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {etapas.map((etapa, i) => (
            <div key={i} className="flex flex-col gap-3">
              {editing ? (
                <div className="flex flex-col gap-2 rounded-lg border border-[#e3ded2] p-3">
                  <Input
                    value={etapa.nome}
                    onChange={(e) => {
                      const next = [...etapas];
                      next[i] = { ...next[i], nome: e.target.value };
                      setEtapas(next);
                    }}
                    className="font-semibold"
                    placeholder="Nome da etapa"
                  />
                  <Textarea
                    value={etapa.itensText}
                    onChange={(e) => {
                      const next = [...etapas];
                      next[i] = { ...next[i], itensText: e.target.value };
                      setEtapas(next);
                    }}
                    className="min-h-24 text-sm"
                    placeholder="Um item por linha"
                  />
                </div>
              ) : (
                <>
                  <SectionBar>{etapa.nome}</SectionBar>
                  {etapa.itensText.trim() && (
                    <div className="flex flex-col gap-1 break-inside-avoid">
                      <p className="text-sm font-bold" style={{ color: "#434532" }}>
                        Demandas Necessárias:
                      </p>
                      <ul className="ml-4 list-disc text-sm text-justify" style={{ color: "#646463" }}>
                        {etapa.itensText
                          .split("\n")
                          .map((i) => i.trim())
                          .filter(Boolean)
                          .map((item, j) => (
                            <li key={j}>{item}</li>
                          ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Investimento / Incluso / Não incluso */}
      <div className="flex w-full max-w-[210mm] flex-col gap-6 bg-white p-[12mm] shadow-md break-before-page print:shadow-none">
        <div className="flex flex-col gap-4 break-inside-avoid">
          <SectionBar variant="investimento">Investimento</SectionBar>
          {editing ? (
            <div className="flex flex-col gap-2 rounded-lg border border-dashed p-4 text-sm" style={{ borderColor: "#434532" }}>
              <label className="flex items-center justify-between gap-2">
                Valor da obra
                <Input
                  type="number"
                  step="0.01"
                  value={valorObra}
                  onChange={(e) => setValorObra(e.target.value)}
                  className="w-40"
                />
              </label>
              <label className="flex items-center justify-between gap-2">
                Tributação
                <Input
                  type="number"
                  step="0.01"
                  value={tributacao}
                  onChange={(e) => setTributacao(e.target.value)}
                  className="w-40"
                />
              </label>
              <label className="flex items-center justify-between gap-2">
                Total com tributação
                <Input
                  type="number"
                  step="0.01"
                  value={totalComTributacao}
                  onChange={(e) => setTotalComTributacao(e.target.value)}
                  className="w-40"
                />
              </label>
            </div>
          ) : (
            <div
              className="flex flex-col items-center gap-1 rounded-sm border border-dashed px-6 py-6 text-center"
              style={{ borderColor: "#434532" }}
            >
              <p className="text-lg font-bold" style={{ color: "#434532" }}>
                Valor da obra: {formatCurrency(Number(valorObra))}
              </p>
              <p className="text-lg font-bold" style={{ color: "#434532" }}>
                Tributação: {formatCurrency(Number(tributacao))}
              </p>
              <p className="text-lg font-bold" style={{ color: "#434532" }}>
                Total com tributação: {formatCurrency(Number(totalComTributacao))}
              </p>
            </div>
          )}

          {editing ? (
            <Input
              value={prazoEstimado}
              onChange={(e) => setPrazoEstimado(e.target.value)}
              placeholder="Prazo para entrega (ex: 150 dias corridos)"
            />
          ) : (
            <div className="flex flex-col gap-1.5 text-center text-sm" style={{ color: "#646463" }}>
              <p>
                <span className="underline">Forma de pagamento</span> – A combinar.
              </p>
              {prazoEstimado && (
                <p>
                  ** <span className="underline">Prazo para entrega</span> - {prazoEstimado} após a
                  aceitação da proposta, mediante a disponibilidade para início da obra.
                </p>
              )}
              <p className="font-semibold" style={{ color: "#c0392b" }}>
                ** O prazo de entrega pode variar de acordo com as datas de finalização de marcenaria e
                marmoraria.
              </p>
              <p className="mt-2">
                Sendo que a proposta está condicionada ao escopo citado acima e possui prazo de validade
                de 15 dias corridos.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 break-inside-avoid">
          <SectionBar>Incluso</SectionBar>
          <ul className="ml-4 list-disc text-sm text-justify" style={{ color: "#646463" }}>
            {INCLUSO.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3 break-inside-avoid">
          <SectionBar>Não incluso</SectionBar>
          <ul className="ml-4 list-disc text-sm text-justify" style={{ color: "#646463" }}>
            {NAO_INCLUSO.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
