// Conexão das tarefas com o Google Agenda. Cada pessoa autoriza uma vez; o sistema cria uma agenda
// "Tarefas Vekio" na conta dela e mantém um evento de dia inteiro por tarefa (com prazo, não concluída).
// Só leva dados do sistema para a agenda: o que for mexido na agenda não volta para o sistema.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { createClient } from "./supabase/server";
import { getTarefa } from "./store";
import { TAREFA_PRIORIDADES, type Tarefa } from "./types";

// Acesso só à agenda criada pelo próprio sistema (não lê as outras agendas da pessoa).
const ESCOPO = "https://www.googleapis.com/auth/calendar.app.created";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://sistema-vekio.vercel.app";
const API = "https://www.googleapis.com/calendar/v3";

export const googleConfigurado = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

// --- Criptografia do token (a chave deriva do segredo do Google, que só existe na Vercel) ---

function chave() {
  return createHash("sha256").update(`vekio-agenda|${process.env.GOOGLE_CLIENT_SECRET ?? ""}`).digest();
}

function cifrar(texto: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave(), iv);
  const dados = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), dados]).toString("base64");
}

function decifrar(cifrado: string) {
  const b = Buffer.from(cifrado, "base64");
  const d = createDecipheriv("aes-256-gcm", chave(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8");
}

// --- Autorização (OAuth) ---

export function urlDeAutorizacao(redirectUri: string, state: string) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: ESCOPO,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

export async function trocarCodigo(code: string, redirectUri: string) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const j = (await r.json()) as { refresh_token?: string; access_token?: string; error?: string };
  if (!r.ok) throw new Error(j.error ?? "Falha ao autorizar no Google.");
  return { refreshToken: j.refresh_token, accessToken: j.access_token! };
}

const acessos = new Map<string, { token: string; expira: number }>();

async function tokenDeAcesso(userId: string, refreshToken: string) {
  const guardado = acessos.get(userId);
  if (guardado && guardado.expira > Date.now() + 60_000) return guardado.token;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  const j = (await r.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!r.ok || !j.access_token) {
    acessos.delete(userId);
    throw Object.assign(new Error(j.error ?? "Falha ao renovar o acesso."), { codigo: j.error });
  }
  acessos.set(userId, { token: j.access_token, expira: Date.now() + (j.expires_in ?? 3000) * 1000 });
  return j.access_token;
}

async function chamar(token: string, metodo: string, caminho: string, corpo?: unknown) {
  const r = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  let json: Record<string, unknown> | null = null;
  try {
    json = (await r.json()) as Record<string, unknown>;
  } catch {
    json = null;
  }
  return { status: r.status, json };
}

// --- Conexão de cada pessoa ---

export async function temConexao(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("google_agenda_conexoes").select("user_id").eq("user_id", userId).maybeSingle();
  return !!data;
}

// Chamado quando a pessoa termina de autorizar: cria (ou reaproveita) a agenda "Tarefas Vekio" e guarda a conexão.
export async function salvarConexao(userId: string, refreshToken: string, accessToken: string) {
  const supabase = await createClient();
  const { data: antiga } = await supabase
    .from("google_agenda_conexoes")
    .select("calendar_id")
    .eq("user_id", userId)
    .maybeSingle();

  let calendarId: string | null = null;
  if (antiga?.calendar_id) {
    const r = await chamar(accessToken, "GET", `/calendars/${encodeURIComponent(antiga.calendar_id)}`);
    if (r.status === 200) calendarId = antiga.calendar_id as string;
  }
  if (!calendarId) {
    const r = await chamar(accessToken, "POST", "/calendars", {
      summary: "Tarefas Vekio",
      description: "Tarefas do Sistema Vekio com prazo. Atualizada automaticamente pelo sistema.",
      timeZone: "America/Sao_Paulo",
    });
    calendarId = (r.json?.id as string | undefined) ?? null;
    if (!calendarId) throw new Error("Não consegui criar a agenda no Google.");
    await supabase.from("tarefa_google_eventos").delete().eq("user_id", userId);
  }

  acessos.set(userId, { token: accessToken, expira: Date.now() + 50 * 60_000 });
  const { error } = await supabase
    .from("google_agenda_conexoes")
    .upsert({ user_id: userId, refresh_token_cifrado: cifrar(refreshToken), calendar_id: calendarId });
  if (error) throw new Error(error.message);
}

export async function desconectar(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("google_agenda_conexoes")
    .select("refresh_token_cifrado, calendar_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (data) {
    try {
      const refresh = decifrar(data.refresh_token_cifrado as string);
      const token = await tokenDeAcesso(userId, refresh);
      await chamar(token, "DELETE", `/calendars/${encodeURIComponent(data.calendar_id as string)}`);
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refresh)}`, { method: "POST" });
    } catch {
      // segue: o importante é parar de sincronizar
    }
  }
  acessos.delete(userId);
  await supabase.from("tarefa_google_eventos").delete().eq("user_id", userId);
  await supabase.from("google_agenda_conexoes").delete().eq("user_id", userId);
}

type Alvo = { token: string; calendarId: string };

async function alvoDe(userId: string): Promise<Alvo | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("google_agenda_conexoes")
    .select("refresh_token_cifrado, calendar_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  try {
    const token = await tokenDeAcesso(userId, decifrar(data.refresh_token_cifrado as string));
    return { token, calendarId: data.calendar_id as string };
  } catch (e) {
    // Autorização revogada pela pessoa no Google: remove a conexão (só consegue se for a própria pessoa).
    if ((e as { codigo?: string }).codigo === "invalid_grant") {
      await supabase.from("google_agenda_conexoes").delete().eq("user_id", userId);
    }
    return null;
  }
}

// --- Evento da tarefa ---

function somarUmDia(dia: string) {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function eventoDe(t: Tarefa) {
  const prioridade = TAREFA_PRIORIDADES.find((p) => p.id === t.prioridade)?.label;
  const origem = t.obraNome ? `Obra: ${t.obraNome}` : t.pessoal ? "Tarefa pessoal" : t.gestao ? "Gestão" : "";
  const linhas = [
    origem,
    prioridade ? `Prioridade: ${prioridade}` : "",
    t.descricao?.trim() ?? "",
    `Abrir no sistema: ${SITE}/tarefas?tarefa=${t.id}`,
  ].filter(Boolean);
  return {
    summary: t.titulo,
    description: linhas.join("\n\n"),
    start: { date: t.prazo },
    end: { date: somarUmDia(t.prazo!) },
    transparency: "transparent",
  };
}

async function sincronizarUsuario(
  tarefaId: string,
  userId: string,
  tarefa: Tarefa | undefined,
  deseja: boolean,
  eventId?: string
) {
  const supabase = await createClient();
  const alvo = await alvoDe(userId);
  if (!alvo) return;
  const cal = encodeURIComponent(alvo.calendarId);

  if (!deseja || !tarefa) {
    if (eventId) {
      await chamar(alvo.token, "DELETE", `/calendars/${cal}/events/${encodeURIComponent(eventId)}`);
      await supabase.from("tarefa_google_eventos").delete().match({ tarefa_id: tarefaId, user_id: userId });
    }
    return;
  }

  const corpo = eventoDe(tarefa);
  let id = eventId;
  if (id) {
    const r = await chamar(alvo.token, "PATCH", `/calendars/${cal}/events/${encodeURIComponent(id)}`, corpo);
    if (r.status === 404 || r.status === 410) id = undefined;
    else if (r.status >= 400) throw new Error(`Google Agenda recusou a atualização (${r.status}).`);
  }
  if (!id) {
    const r = await chamar(alvo.token, "POST", `/calendars/${cal}/events`, corpo);
    id = r.json?.id as string | undefined;
    if (!id) throw new Error(`Google Agenda recusou o evento (${r.status}).`);
    await supabase.from("tarefa_google_eventos").upsert({ tarefa_id: tarefa.id, user_id: userId, event_id: id });
  }
}

// Mantém a agenda dos responsáveis igual à tarefa: cria/atualiza se tem prazo e não está concluída,
// apaga o evento caso contrário (concluída, sem prazo, ou a pessoa deixou de ser responsável).
// Nunca lança erro: a agenda é um extra e não pode atrapalhar o uso da tarefa.
export async function sincronizarTarefa(tarefaId: string, opcoes?: { somenteUsuario?: string; tarefa?: Tarefa }) {
  try {
    if (!googleConfigurado()) return;
    const supabase = await createClient();
    const tarefa = opcoes?.tarefa ?? (await getTarefa(tarefaId));
    const { data: mapa } = await supabase
      .from("tarefa_google_eventos")
      .select("user_id, event_id")
      .eq("tarefa_id", tarefaId);
    const eventos = new Map((mapa ?? []).map((m) => [m.user_id as string, m.event_id as string]));
    const querem = new Set(
      tarefa && tarefa.status !== "concluida" && tarefa.prazo ? tarefa.responsaveis.map((r) => r.id) : []
    );
    const todos = new Set([...querem, ...eventos.keys()]);
    for (const uid of todos) {
      if (opcoes?.somenteUsuario && uid !== opcoes.somenteUsuario) continue;
      try {
        await sincronizarUsuario(tarefaId, uid, tarefa, querem.has(uid), eventos.get(uid));
      } catch (e) {
        console.error("[google-agenda] falha ao sincronizar", tarefaId, uid, e);
      }
    }
  } catch (e) {
    console.error("[google-agenda] falha", tarefaId, e);
  }
}

// Antes de excluir a tarefa: apaga os eventos dela nas agendas (depois o banco apaga o vínculo).
export async function removerEventosDaTarefa(tarefaId: string) {
  try {
    if (!googleConfigurado()) return;
    const supabase = await createClient();
    const { data: mapa } = await supabase.from("tarefa_google_eventos").select("user_id, event_id").eq("tarefa_id", tarefaId);
    for (const m of mapa ?? []) {
      try {
        const alvo = await alvoDe(m.user_id as string);
        if (alvo) {
          await chamar(
            alvo.token,
            "DELETE",
            `/calendars/${encodeURIComponent(alvo.calendarId)}/events/${encodeURIComponent(m.event_id as string)}`
          );
        }
      } catch (e) {
        console.error("[google-agenda] falha ao apagar evento", tarefaId, e);
      }
    }
  } catch (e) {
    console.error("[google-agenda] falha", tarefaId, e);
  }
}

// Primeira sincronização, logo depois de conectar: leva as tarefas abertas da pessoa para a agenda.
export async function sincronizarTudoDoUsuario(userId: string, tarefas: Tarefa[]) {
  const minhas = tarefas.filter(
    (t) => t.status !== "concluida" && !!t.prazo && t.responsaveis.some((r) => r.id === userId)
  );
  for (let i = 0; i < minhas.length; i += 5) {
    await Promise.all(minhas.slice(i, i + 5).map((t) => sincronizarTarefa(t.id, { somenteUsuario: userId, tarefa: t })));
  }
}
