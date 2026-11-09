import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { podeUsarAssistente } from "@/lib/recursos";
import { carregarContexto, conversarAssistente, type MensagemChat } from "@/lib/assistente";

// A conversa pode consultar dados várias vezes antes de responder.
export const maxDuration = 60;

const MAX_MENSAGENS = 16;
const MAX_CARACTERES = 4000;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !podeUsarAssistente(user)) {
    return NextResponse.json({ error: "Você não tem acesso ao assistente." }, { status: 401 });
  }

  let corpo: { mensagens?: unknown };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const recebidas = Array.isArray(corpo.mensagens) ? corpo.mensagens : [];
  const mensagens: MensagemChat[] = recebidas
    .filter(
      (m): m is MensagemChat =>
        !!m && typeof m === "object" && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CARACTERES) }))
    .slice(-MAX_MENSAGENS);

  if (mensagens.length === 0) return NextResponse.json({ error: "Escreva uma mensagem." }, { status: 400 });

  const ctx = await carregarContexto(user);
  const resposta = await conversarAssistente(mensagens, ctx);
  if ("error" in resposta) return NextResponse.json({ error: resposta.error }, { status: 200 });
  return NextResponse.json(resposta);
}
