import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listarNotificacoes } from "@/lib/notificacoes";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role === "cliente") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const dados = await listarNotificacoes(user);
  return NextResponse.json(dados, { headers: { "Cache-Control": "no-store" } });
}
