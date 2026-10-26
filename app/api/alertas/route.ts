import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { enviarEmail } from "@/lib/email";
import { enviarParaAssinaturas, type AssinaturaPush } from "@/lib/push";

// Job diário: verifica datas importantes próximas e envia alerta por e-mail.
// Protegido pelo CRON_SECRET (a Vercel envia no header Authorization ao rodar o cron).

// Aceita um ou vários e-mails separados por vírgula em ALERTA_EMAIL.
const ALERTA_EMAILS = (process.env.ALERTA_EMAIL ?? "yago@vekio.co")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  // Client sem sessão (as funções RPC são SECURITY DEFINER, gated pelo segredo).
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { data: pendentes, error } = await supabase.rpc("alertas_pendentes", { p_secret: secret });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const lista = (pendentes ?? []) as {
    id: string;
    titulo: string;
    descricao: string;
    data_ocorrencia: string;
  }[];

  let enviados = 0;
  for (const d of lista) {
    const html = `
      <div style="font-family: sans-serif; color: #2b2b2b;">
        <h2 style="color: #424431;">Lembrete — Vekio Engenharia</h2>
        <p>A data importante <strong>${d.titulo}</strong> está próxima.</p>
        <p><strong>Data:</strong> ${formatDate(d.data_ocorrencia)}</p>
        ${d.descricao ? `<p>${d.descricao}</p>` : ""}
        <p style="color: #595c47; font-size: 12px;">Enviado automaticamente pelo Sistema Vekio.</p>
      </div>`;
    const res = await enviarEmail({
      to: ALERTA_EMAILS,
      subject: `Lembrete: ${d.titulo} (${formatDate(d.data_ocorrencia)})`,
      html,
    });
    if (res.ok) {
      await supabase.rpc("marcar_alerta_enviado", { p_secret: secret, p_id: d.id });
      enviados += 1;
    }
  }

  // Push no celular dos admins: datas importantes que acabaram de ser alertadas
  // + parcelas que vencem hoje + contas fixas pra pagar hoje.
  let pushEnviados = 0;
  try {
    const { data: assinaturas } = await supabase.rpc("push_assinaturas_admin", { p_secret: secret });
    const { data: financeiros } = await supabase.rpc("alertas_financeiros_hoje", { p_secret: secret });
    const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const avisos = [
      ...((financeiros ?? []) as {
        titulo: string;
        descricao: string;
        valor: number;
        link: string;
      }[]).map((f) => ({
        titulo: f.titulo,
        descricao: `${f.descricao} — ${BRL(Number(f.valor))}`,
        link: f.link,
      })),
      ...lista.map((d) => ({
        titulo: `Lembrete: ${d.titulo}`,
        descricao: formatDate(d.data_ocorrencia),
        link: "/datas-importantes",
      })),
    ];
    const alvo = (assinaturas ?? []) as AssinaturaPush[];
    if (alvo.length > 0) {
      for (const aviso of avisos) {
        await enviarParaAssinaturas(alvo, aviso);
        pushEnviados += 1;
      }
    }
  } catch {
    // push é complementar ao e-mail: falha aqui não derruba o job
  }

  return NextResponse.json({ ok: true, verificados: lista.length, enviados, pushEnviados });
}
