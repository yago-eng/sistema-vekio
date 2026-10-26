import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ARQUIVOS_BUCKET, getArquivo } from "@/lib/store";

// Miniatura (480px, WebP) de fotos — a galeria carrega dezenas de imagens e
// não pode puxar cada original de vários MB.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const arquivo = await getArquivo(id);
  if (!arquivo || !arquivo.mimeType.startsWith("image/")) {
    return NextResponse.json({ error: "Sem miniatura" }, { status: 404 });
  }

  const supabase = await createClient();
  const { data: blob, error } = await supabase.storage.from(ARQUIVOS_BUCKET).download(arquivo.caminhoArmazenado);
  if (error || !blob) return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });

  try {
    const miniatura = await sharp(Buffer.from(await blob.arrayBuffer()))
      .rotate()
      .resize(480, 480, { fit: "cover" })
      .webp({ quality: 70 })
      .toBuffer();
    return new NextResponse(new Uint8Array(miniatura), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=86400" },
    });
  } catch {
    return NextResponse.json({ error: "Formato sem miniatura" }, { status: 415 });
  }
}
