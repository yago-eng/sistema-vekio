// Criação de tarefas por texto livre ou voz (já transcrita no aparelho): a IA lê o pedido
// e devolve os campos da tarefa; quem confirma e salva é o usuário (ou o modo "criar direto").

import { TAREFA_PRIORIDADES, TAREFA_RECORRENCIAS } from "./types";

const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";

const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

export type RascunhoTarefa = {
  titulo: string;
  descricao: string;
  obraId: string | null;
  responsavelIds: string[];
  prazo: string | null;
  prioridade: string;
  recorrencia: string;
  checklist: string[];
};

export type ContextoIA = {
  hoje: string; // YYYY-MM-DD, fuso de São Paulo
  obras: { id: string; nome: string }[];
  membros: { id: string; nome: string }[];
  usuario: { id: string; nome: string };
  obraFixaId?: string;
};

function calendario(hoje: string): string {
  const base = new Date(`${hoje}T12:00:00Z`);
  const linhas: string[] = [];
  for (let i = 0; i < 21; i++) {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    linhas.push(`${iso} = ${DIAS[d.getUTCDay()]}${i === 0 ? " (hoje)" : i === 1 ? " (amanhã)" : ""}`);
  }
  return linhas.join("\n");
}

export async function interpretarPedidoDeTarefa(
  texto: string,
  ctx: ContextoIA
): Promise<{ rascunho: RascunhoTarefa } | { error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "A criação por IA ainda não está configurada neste sistema." };

  const obraFixa = ctx.obraFixaId ? ctx.obras.find((o) => o.id === ctx.obraFixaId) : undefined;
  const sistema =
    "Você transforma pedidos falados ou escritos em português do Brasil em tarefas de uma construtora/engenharia. " +
    "Sempre responda chamando a ferramenta criar_tarefa.\n\n" +
    `Quem está pedindo: ${ctx.usuario.nome} (id ${ctx.usuario.id}). Quando o pedido disser "me coloque", "eu", "pra mim" ou não citar ninguém, o responsável é essa pessoa. A tarefa pode ter mais de um responsável (ex.: "eu e o Antonio"): liste todos em responsavel_ids.\n\n` +
    `Datas (fuso de São Paulo). Use SEMPRE esta tabela para converter "hoje", "amanhã", "sexta", "sexta dessa semana", "dia 15" etc. em AAAA-MM-DD:\n${calendario(ctx.hoje)}\n` +
    '"Sexta dessa semana" é a próxima sexta-feira a partir de hoje (ou hoje, se hoje for sexta). Se não houver prazo no pedido, deixe prazo vazio.\n\n' +
    "Obras disponíveis (use o id exato; escolha a que mais combina com o nome citado, ignorando acentos e maiúsculas; se nenhuma combinar claramente, deixe obra_id vazio):\n" +
    (ctx.obras.length ? ctx.obras.map((o) => `- ${o.nome} (id ${o.id})`).join("\n") : "(nenhuma)") +
    "\n\nPessoas da equipe (use o id exato):\n" +
    ctx.membros.map((m) => `- ${m.nome} (id ${m.id})`).join("\n") +
    (obraFixa ? `\n\nO pedido foi feito dentro da obra "${obraFixa.nome}" (id ${obraFixa.id}); use essa obra, a menos que o pedido cite outra.` : "") +
    "\n\nRegras: o título é curto e começa com verbo no infinitivo (ex.: \"Comprar argamassa\"). " +
    "Detalhes extras vão em descricao. Itens que o pedido enumera como passos vão em checklist (não invente itens). " +
    "Prioridade só é diferente de normal se o pedido indicar urgência/importância. " +
    "Repetição só se o pedido disser que se repete (todo dia, toda semana, todo mês...).";

  try {
    const res = await fetch(ANTHROPIC_ENDPOINT, {
      method: "POST",
      signal: AbortSignal.timeout(25_000),
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        system: sistema,
        tools: [
          {
            name: "criar_tarefa",
            description: "Cria uma tarefa a partir do pedido do usuário.",
            input_schema: {
              type: "object",
              properties: {
                titulo: { type: "string" },
                descricao: { type: "string" },
                obra_id: { type: ["string", "null"] },
                responsavel_ids: { type: "array", items: { type: "string" }, description: "ids das pessoas responsáveis (uma ou mais)" },
                prazo: { type: ["string", "null"], description: "AAAA-MM-DD" },
                prioridade: { type: "string", enum: TAREFA_PRIORIDADES.map((p) => p.id) },
                recorrencia: { type: "string", enum: TAREFA_RECORRENCIAS.map((r) => r.id) },
                checklist: { type: "array", items: { type: "string" } },
              },
              required: ["titulo"],
            },
          },
        ],
        tool_choice: { type: "tool", name: "criar_tarefa" },
        messages: [{ role: "user", content: texto }],
      }),
    });
    if (!res.ok) return { error: "A IA não conseguiu responder agora. Tente de novo em instantes." };
    const json = await res.json();
    const uso = (json?.content ?? []).find((c: { type: string }) => c.type === "tool_use");
    const dados = uso?.input as Record<string, unknown> | undefined;
    if (!dados || typeof dados.titulo !== "string" || !dados.titulo.trim()) {
      return { error: "Não entendi o pedido. Tente descrever a tarefa de outro jeito." };
    }

    const obraId = typeof dados.obra_id === "string" && ctx.obras.some((o) => o.id === dados.obra_id) ? dados.obra_id : (ctx.obraFixaId ?? null);
    const responsavelIds = Array.isArray(dados.responsavel_ids)
      ? Array.from(
          new Set(
            dados.responsavel_ids.filter(
              (id): id is string => typeof id === "string" && ctx.membros.some((m) => m.id === id)
            )
          )
        )
      : [];
    const prazo = typeof dados.prazo === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dados.prazo) ? dados.prazo : null;
    const prioridade = TAREFA_PRIORIDADES.some((p) => p.id === dados.prioridade) ? (dados.prioridade as string) : "normal";
    let recorrencia = TAREFA_RECORRENCIAS.some((r) => r.id === dados.recorrencia) ? (dados.recorrencia as string) : "nenhuma";
    if (recorrencia !== "nenhuma" && !prazo) recorrencia = "nenhuma";

    return {
      rascunho: {
        titulo: dados.titulo.trim().slice(0, 200),
        descricao: typeof dados.descricao === "string" ? dados.descricao.trim() : "",
        obraId,
        responsavelIds,
        prazo,
        prioridade,
        recorrencia,
        checklist: Array.isArray(dados.checklist)
          ? dados.checklist.filter((i): i is string => typeof i === "string" && i.trim().length > 0).map((i) => i.trim()).slice(0, 20)
          : [],
      },
    };
  } catch {
    return { error: "A IA demorou demais para responder. Tente de novo." };
  }
}
