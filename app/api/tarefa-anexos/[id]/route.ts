import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { podeUsarTarefas } from "@/lib/recursos";
import { ARQUIVOS_BUCKET, getTarefaAnexo } from "@/lib/store";

const INLINE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !podeUsarTarefas(user)) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const anexo = await getTarefaAnexo(id);
  if (!anexo) return NextResponse.json({ error: "Anexo não encontrado" }, { status: 404 });

  const supabase = await createClient();
  const { data: blob, error } = await supabase.storage.from(ARQUIVOS_BUCKET).download(anexo.caminhoArmazenado);
  if (error || !blob) return NextResponse.json({ error: "Arquivo não encontrado no storage" }, { status: 404 });

  const buffer = Buffer.from(await blob.arrayBuffer());
  const disposition = INLINE_TYPES.has(anexo.mimeType) ? "inline" : "attachment";
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": anexo.mimeType,
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(anexo.nomeOriginal)}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
