import { after, NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { podeUsarTarefas } from "@/lib/recursos";
import { googleConfigurado, salvarConexao, sincronizarTudoDoUsuario, trocarCodigo } from "@/lib/google-agenda";
import { listTarefas } from "@/lib/store";

export const maxDuration = 60;

// Segundo passo: o Google devolve a pessoa para cá, já autorizada.
export async function GET(request: NextRequest) {
  const origem = request.nextUrl.origin;
  const voltar = (resultado: string) => {
    const r = NextResponse.redirect(`${origem}/tarefas?agenda=${resultado}`);
    r.cookies.delete("google_agenda_state");
    return r;
  };

  const user = await getCurrentUser();
  if (!user || user.role === "cliente" || !podeUsarTarefas(user)) return NextResponse.redirect(`${origem}/login`);
  if (!googleConfigurado()) return voltar("erro");

  const params = request.nextUrl.searchParams;
  if (params.get("error")) return voltar("negado");
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state || state !== request.cookies.get("google_agenda_state")?.value) return voltar("erro");

  try {
    const { refreshToken, accessToken } = await trocarCodigo(code, `${origem}/api/google/callback`);
    if (!refreshToken) return voltar("erro");
    await salvarConexao(user.id, refreshToken, accessToken);

    after(async () => {
      const tarefas = [
        ...(await listTarefas()),
        ...(await listTarefas({ pessoal: true })),
        ...(user.role === "admin" ? await listTarefas({ gestao: true }) : []),
      ];
      await sincronizarTudoDoUsuario(user.id, tarefas);
    });
    return voltar("conectado");
  } catch (e) {
    console.error("[google-agenda] falha ao conectar", e);
    return voltar("erro");
  }
}
