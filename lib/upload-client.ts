"use client";

import { createClient } from "@/lib/supabase/client";

// Precisa bater com ARQUIVOS_BUCKET em lib/store.ts.
const ARQUIVOS_BUCKET = "arquivos";

const TIMEOUT_MS = 90_000;

// Envia o arquivo direto do navegador pro Supabase Storage usando uma URL
// assinada — os bytes do arquivo nunca passam pelo nosso servidor (Vercel
// Function), evitando o limite físico de 4,5MB de corpo de requisição.
//
// Em conexão fraca de obra, um arquivo grande podia travar esse envio
// indefinidamente sem nenhum erro aparecer na tela — o timeout abaixo
// garante que, depois de um tempo, o usuário vê uma mensagem clara em vez
// de um carregamento infinito.
export async function enviarArquivoDireto(path: string, token: string, file: File): Promise<void> {
  const supabase = createClient();
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error("O envio demorou demais e foi cancelado. Verifique sua conexão e tente novamente.")),
      TIMEOUT_MS
    )
  );
  const { error } = await Promise.race([
    supabase.storage.from(ARQUIVOS_BUCKET).uploadToSignedUrl(path, token, file),
    timeout,
  ]);
  if (error) throw error;
}
