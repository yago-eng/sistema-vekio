import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getObra, listArquivos, listClientesDaObra, listEtapas, listRelatoriosObra } from "@/lib/store";
import { PortalRelatorioObra } from "@/components/portal-relatorio-obra";
import { PortalFotosVideos, isFotoOuVideo } from "@/components/portal-fotos-videos";
import { PortalArquivoLista } from "@/components/portal-arquivo-lista";
import { GanttChart } from "@/components/gantt-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { ABAS_CLIENTE, type AbaCliente } from "@/lib/types";

export default async function PortalObraPage({
  params,
}: {
  params: Promise<{ obraId: string }>;
}) {
  const { obraId } = await params;
  const user = await getCurrentUser();

  const [obra, arquivos, etapas, clientes, relatoriosObra] = await Promise.all([
    getObra(obraId),
    listArquivos(obraId),
    listEtapas(obraId),
    listClientesDaObra(obraId),
    listRelatoriosObra(obraId),
  ]);

  if (!obra) notFound();

  const meuAcesso = clientes.find((c) => c.clienteId === user?.id);
  // Segunda trava (além do RLS): um usuário com role "cliente" só pode ver
  // esta página se tiver um vínculo explícito com ESTA obra — nunca cai no
  // "mostra tudo por padrão". A equipe/admin continua podendo abrir
  // qualquer obra aqui pra pré-visualizar como o cliente vê (vê todas as
  // abas nesse caso, o que é esperado).
  if (user?.role === "cliente" && !meuAcesso) notFound();
  const abasHabilitadas = new Set<AbaCliente>(meuAcesso?.abasVisiveis ?? ABAS_CLIENTE.map((a) => a.id));
  const abasVisiveis = ABAS_CLIENTE.filter((a) => abasHabilitadas.has(a.id));

  // Notas fiscais/cupons são papel interno da empresa — nunca aparecem pro cliente.
  const visiveis = arquivos.filter((a) => a.categoria !== "nota_fiscal");
  const fotosERegistros = visiveis.filter((a) => isFotoOuVideo(a) || a.categoria === "registro");
  const documentos = visiveis.filter((a) => a.categoria !== "registro" && !isFotoOuVideo(a));

  if (abasVisiveis.length === 0) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <Link
          href="/portal"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Suas obras
        </Link>
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhuma informação disponível para você nessa obra no momento.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <Link
          href="/portal"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Suas obras
        </Link>
        <h1 className="text-2xl font-semibold">{obra.nome}</h1>
        <p className="text-sm text-muted-foreground">
          {obra.endereco} · {obra.regiao}
        </p>
      </div>

      <Tabs defaultValue={abasVisiveis[0].id}>
        <TabsList className="flex-wrap">
          {abasVisiveis.map((aba) => (
            <TabsTrigger key={aba.id} value={aba.id}>
              {aba.id === "fotos" ? "Fotos/Registros de obra" : aba.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {abasHabilitadas.has("cronograma") && (
          <TabsContent value="cronograma">
            <Card>
              <CardContent className="pt-6">
                <GanttChart obraId={obra.id} etapas={etapas} readOnly />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {abasHabilitadas.has("diario") && (
          <TabsContent value="diario">
            <Card>
              <CardContent className="pt-6">
                <PortalRelatorioObra relatorios={relatoriosObra} />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {abasHabilitadas.has("fotos") && (
          <TabsContent value="fotos">
            <Card>
              <CardContent className="pt-6">
                <PortalFotosVideos arquivos={fotosERegistros} />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {abasHabilitadas.has("documentos") && (
          <TabsContent value="documentos">
            <Card>
              <CardContent className="pt-6">
                <PortalArquivoLista arquivos={documentos} vazio="Nenhum documento compartilhado ainda." />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
