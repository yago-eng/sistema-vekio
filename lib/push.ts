import webpush from "web-push";
import { createClient } from "./supabase/server";

export type PayloadPush = { titulo: string; descricao: string; link?: string | null };
export type AssinaturaPush = { endpoint: string; p256dh: string; auth: string };

let configurado = false;
function configurar(): boolean {
  if (configurado) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:contato@vekio.co", pub, priv);
  configurado = true;
  return true;
}

// Envia para as assinaturas e devolve os endpoints que não existem mais
// (aparelho que desinstalou o app / revogou a permissão).
export async function enviarParaAssinaturas(
  assinaturas: AssinaturaPush[],
  payload: PayloadPush
): Promise<string[]> {
  if (!configurar()) return [];
  const invalidos: string[] = [];
  await Promise.all(
    assinaturas.map(async (a) => {
      try {
        await webpush.sendNotification(
          { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 12 }
        );
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) invalidos.push(a.endpoint);
      }
    })
  );
  return invalidos;
}

// Avisa a equipe toda (menos quem fez a ação) no celular. Nunca pode quebrar
// a ação que originou o aviso — qualquer falha é ignorada.
export async function enviarPushParaEquipe(payload: PayloadPush, excluirUserId?: string): Promise<void> {
  try {
    if (!configurar()) return;
    const supabase = await createClient();
    const { data } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth, user_id");
    const alvo = (data ?? []).filter((a) => a.user_id !== excluirUserId) as (AssinaturaPush & {
      user_id: string;
    })[];
    if (alvo.length === 0) return;
    const invalidos = await Promise.race([
      enviarParaAssinaturas(alvo, payload),
      new Promise<string[]>((resolve) => setTimeout(() => resolve([]), 6000)),
    ]);
    if (invalidos.length > 0) {
      await supabase.from("push_subscriptions").delete().in("endpoint", invalidos);
    }
  } catch {
    // ignora
  }
}

// Avisa uma pessoa só (ex.: quem recebeu uma tarefa). Mesma regra: nunca quebra a ação.
export async function enviarPushParaUsuario(userId: string, payload: PayloadPush): Promise<void> {
  try {
    if (!configurar()) return;
    const supabase = await createClient();
    const { data } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);
    const alvo = (data ?? []) as AssinaturaPush[];
    if (alvo.length === 0) return;
    const invalidos = await Promise.race([
      enviarParaAssinaturas(alvo, payload),
      new Promise<string[]>((resolve) => setTimeout(() => resolve([]), 6000)),
    ]);
    if (invalidos.length > 0) {
      await supabase.from("push_subscriptions").delete().in("endpoint", invalidos);
    }
  } catch {
    // ignora
  }
}
