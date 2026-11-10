import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// Transcreve o áudio gravado no aparelho (o Safari do iPhone não consegue ditar de forma confiável).
// Só funciona se OPENAI_API_KEY estiver configurada no servidor; sem ela o sistema usa o ditado do
// navegador. O modelo pode ser trocado com TRANSCRICAO_MODELO, sem mexer no código.
export const maxDuration = 60;

const ENDPOINT = "https://api.openai.com/v1/audio/transcriptions";
const MODELOS = [process.env.TRANSCRICAO_MODELO, "gpt-transcribe", "gpt-4o-mini-transcribe"].filter(
  (m, i, lista): m is string => Boolean(m) && lista.indexOf(m) === i
);
const LIMITE_BYTES = 20 * 1024 * 1024; // o serviço aceita até 25 MB

async function usuarioDaEquipe() {
  const user = await getCurrentUser();
  return user && user.role !== "cliente" ? user : null;
}

// Diz se a transcrição no servidor está disponível (a tela escolhe o modo de voz com isso).
export async function GET() {
  if (!(await usuarioDaEquipe())) return NextResponse.json({ ativo: false }, { status: 401 });
  return NextResponse.json({ ativo: Boolean(process.env.OPENAI_API_KEY) });
}

export async function POST(req: NextRequest) {
  if (!(await usuarioDaEquipe())) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const chave = process.env.OPENAI_API_KEY;
  if (!chave) return NextResponse.json({ error: "A transcrição de áudio não está configurada." }, { status: 503 });

  let audio: FormDataEntryValue | null;
  try {
    audio = (await req.formData()).get("audio");
  } catch {
    return NextResponse.json({ error: "Áudio inválido." }, { status: 400 });
  }
  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ error: "Nenhum áudio recebido." }, { status: 400 });
  }
  if (audio.size > LIMITE_BYTES) {
    return NextResponse.json({ error: "A gravação ficou longa demais. Grave em partes menores." }, { status: 413 });
  }

  for (const modelo of MODELOS) {
    const corpo = new FormData();
    corpo.append("file", audio, audio.name || "audio.m4a");
    corpo.append("model", modelo);
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${chave}` },
        body: corpo,
        signal: AbortSignal.timeout(50_000),
      });
      if (res.ok) {
        const json = (await res.json()) as { text?: unknown };
        return NextResponse.json({ texto: typeof json.text === "string" ? json.text.trim() : "" });
      }
      const detalhe = (await res.text()).slice(0, 300);
      console.error("transcrever: erro do serviço", modelo, res.status, detalhe);
      // Modelo inexistente ou recusado: tenta o próximo da lista. Outros erros não adiantam repetir.
      if (res.status !== 400 && res.status !== 404) break;
    } catch (e) {
      console.error("transcrever: falha de rede", modelo, e instanceof Error ? e.message : e);
      break;
    }
  }
  return NextResponse.json({ error: "Não consegui transcrever o áudio agora. Tente de novo ou digite." }, { status: 502 });
}
