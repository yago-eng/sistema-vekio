import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { podeUsarTarefas } from "@/lib/recursos";
import { googleConfigurado, urlDeAutorizacao } from "@/lib/google-agenda";

// Primeiro passo: leva a pessoa para a tela de autorização do Google.
export async function GET(request: NextRequest) {
  const origem = request.nextUrl.origin;
  const user = await getCurrentUser();
  if (!user || user.role === "cliente" || !podeUsarTarefas(user)) {
    return NextResponse.redirect(`${origem}/login`);
  }
  if (!googleConfigurado()) return NextResponse.redirect(`${origem}/tarefas?agenda=erro`);

  const state = randomBytes(16).toString("hex");
  const resposta = NextResponse.redirect(urlDeAutorizacao(`${origem}/api/google/callback`, state));
  resposta.cookies.set("google_agenda_state", state, {
    httpOnly: true,
    secure: origem.startsWith("https"),
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return resposta;
}
