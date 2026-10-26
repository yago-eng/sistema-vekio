import { notFound } from "next/navigation";
import { getArquivo } from "@/lib/store";
import { ArquivoViewer } from "@/components/arquivo-viewer";

// Visualizador de arquivo dentro do app (com botão de voltar). Abrir o
// arquivo cru em outra aba deixava o celular — principalmente o app
// instalado na tela inicial — sem nenhuma forma de voltar.
export default async function ArquivoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const arquivo = await getArquivo(id);
  if (!arquivo) notFound();

  return <ArquivoViewer id={arquivo.id} nome={arquivo.nomeOriginal} mimeType={arquivo.mimeType} />;
}
