import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { Mail, Phone, AtSign } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getObra, getOrcamentoEscopo, listOrcamentos } from "@/lib/store";
import { PrintButton } from "@/components/print-button";
import { EscopoEditor } from "@/components/escopo-editor";

export const metadata = {
  other: { "format-detection": "telephone=no, email=no, address=no" },
};

function WatermarkPattern({ className, opacity = 0.12 }: { className?: string; opacity?: number }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute flex flex-col gap-5 ${className ?? ""}`} style={{ opacity }}>
      {Array.from({ length: 7 }).map((_, i) => (
        <Image
          key={i}
          src="/brand/logo-symbol-branco.png"
          alt=""
          width={1080}
          height={188}
          unoptimized
          className="h-14 w-auto self-end"
        />
      ))}
    </div>
  );
}

export default async function EscopoObraPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ orcamento?: string }>;
}) {
  const { id } = await params;
  const { orcamento } = await searchParams;

  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (currentUser.role !== "admin") redirect("/obras");

  const obra = await getObra(id);
  if (!obra) notFound();

  const orcamentos = await listOrcamentos(id);
  const orcamentoId = orcamento && orcamentos.some((o) => o.id === orcamento) ? orcamento : orcamentos[0]?.id;
  if (!orcamentoId) notFound();

  const escopo = await getOrcamentoEscopo(orcamentoId);
  if (!escopo) notFound();

  return (
    <div className="flex flex-col items-center gap-6 bg-[#e5e3dc] py-8 text-[#2b2b2b] print:gap-0 print:bg-white print:py-0 print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]">
      <div className="flex w-full max-w-[210mm] justify-end px-2 print:hidden">
        <PrintButton />
      </div>

      {/* Capa */}
      <div
        className="relative flex w-full max-w-[210mm] flex-col overflow-hidden bg-[#434532] pt-[16mm] pr-[16mm] pb-[16mm] pl-[20mm] shadow-md break-after-page print:shadow-none"
        style={{ minHeight: "297mm" }}
      >
        <WatermarkPattern className="bottom-0 right-0 h-1/2 w-[75%]" />
        <Image
          src="/brand/logo-stacked-branco.png"
          alt="Vekio Engenharia"
          width={91}
          height={80}
          unoptimized
          className="relative z-10 block w-[90mm] h-auto self-start"
        />
      </div>

      <EscopoEditor
        obraId={obra.id}
        orcamentoId={orcamentoId}
        escopo={escopo}
        obraNome={obra.nome}
        clienteNome={obra.clienteNome}
        endereco={obra.endereco}
      />

      {/* Contracapa */}
      <div
        className="relative flex w-full max-w-[210mm] flex-col justify-between overflow-hidden bg-[#434532] p-[16mm] text-[#faf9f6] shadow-md break-before-page print:shadow-none"
        style={{ minHeight: "297mm" }}
      >
        <WatermarkPattern className="bottom-0 right-0 h-1/2 w-[45%]" opacity={0.06} />
        <div className="relative z-10 flex justify-end self-stretch">
          <div className="w-fit shrink-0 rounded-lg bg-[#f0eee7] p-3">
            <Image
              src="/brand/logo-stacked-trim.png"
              alt="Vekio Engenharia"
              width={91}
              height={80}
              unoptimized
              className="block h-14 w-auto"
            />
          </div>
        </div>

        <div className="relative z-10 flex flex-col gap-6 text-sm">
          <div className="flex flex-col gap-3">
            <p className="border-b border-[#faf9f6]/40 pb-1 text-xs font-bold tracking-[0.12em] uppercase">
              Equipe técnica
            </p>
            <div>
              <p className="font-semibold">Antonio Paulo Soares</p>
              <p className="text-xs opacity-80">Engenheiro Civil · CREA: 162597-1</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs opacity-90">
                <Mail className="size-3" /> antonio@vekio.co
              </p>
            </div>
            <div>
              <p className="font-semibold">Yago Willinghöfer</p>
              <p className="text-xs opacity-80">Engenheiro Civil · CREA: 196226-2</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs opacity-90">
                <Mail className="size-3" /> yago@vekio.co
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className="border-b border-[#faf9f6]/40 pb-1 text-xs font-bold tracking-[0.12em] uppercase">
              Contato
            </p>
            <div>
              <p className="font-semibold">Balneário Camboriú</p>
              <p className="flex items-center gap-1.5 text-xs opacity-90">
                <Phone className="size-3" /> (47) 99128-1408
              </p>
              <p className="flex items-center gap-1.5 text-xs opacity-90">
                <Mail className="size-3" /> contato@vekio.co
              </p>
            </div>
            <div>
              <p className="font-semibold">Florianópolis</p>
              <p className="flex items-center gap-1.5 text-xs opacity-90">
                <Phone className="size-3" /> (48) 99173-4599
              </p>
              <p className="flex items-center gap-1.5 text-xs opacity-90">
                <Mail className="size-3" /> contato@vekio.co
              </p>
            </div>
          </div>

          <p className="flex items-center gap-1.5 text-xs opacity-80">
            <AtSign className="size-3" /> vekio.engenharia
          </p>
        </div>
      </div>
    </div>
  );
}
