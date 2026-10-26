import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role === "cliente") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const chave = process.env.VAPID_PUBLIC_KEY;
  if (!chave) return NextResponse.json({ error: "Push não configurado" }, { status: 503 });
  return NextResponse.json({ chave }, { headers: { "Cache-Control": "no-store" } });
}
