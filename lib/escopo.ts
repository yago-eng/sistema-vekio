// Geração do escopo de serviços (formalização de orçamento) via Claude,
// a partir dos itens orçados e dos projetos/documentos anexados à proposta.
//
// Usa "tool use" forçado (tool_choice) em vez de pedir JSON em texto livre —
// a API já devolve o objeto estruturado em `input`, sem precisar extrair via
// regex de um texto solto (que falhava sempre que o modelo respondia algo
// fora do formato esperado).

import { uploadArquivoAnthropic, deletarArquivoAnthropic, FILES_BETA_HEADER } from "./anthropic-files";

const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";

export type EscopoGerado = {
  etapas: { nome: string; itens: string[] }[];
  prazoEstimado: string | null;
  condicoes: string;
  documentosIgnorados?: string[];
};

const EMITIR_ESCOPO_TOOL = {
  name: "emitir_escopo",
  description: "Emite o escopo de serviços estruturado da proposta comercial.",
  input_schema: {
    type: "object",
    properties: {
      etapas: {
        type: "array",
        items: {
          type: "object",
          properties: {
            nome: { type: "string" },
            itens: {
              type: "array",
              items: { type: "string" },
              description:
                "Lista de itens de \"Demandas Necessárias\" dessa etapa. Cada item DEVE começar com um " +
                "verbo de ação no infinitivo (Executar, Instalar, Adequar, Fornecer, Aplicar, Montar, " +
                "Substituir, etc.) seguido dos materiais e/ou serviços específicos envolvidos, com base " +
                "apenas na descrição dos itens orçados/documentos dessa etapa — nunca invente serviços, " +
                "materiais, equipe ou fornecedores que não estejam nos dados fornecidos.",
            },
          },
          required: ["nome", "itens"],
        },
      },
      prazoEstimado: {
        type: ["string", "null"],
        description:
          "Apenas a duração estimada da obra, no formato \"N dias corridos\" (ex.: \"150 dias corridos\"), " +
          "ou null se não for possível estimar. NÃO escreva uma frase completa — só o número e a unidade, " +
          "pois esse texto é inserido dentro de uma frase fixa do documento.",
      },
    },
    required: ["etapas"],
  },
};

type DocumentoEnviado = { mediaType: string; fileId: string; nomeOriginal: string };

function montarPrompt(input: {
  obraNome: string;
  clienteNome: string;
  endereco: string;
  itensLength: number;
  documentosLength: number;
  etapasResumo: string;
}): string {
  return (
    "Você é responsável por redigir a proposta comercial (escopo de serviços) da Vekio Engenharia, " +
    "uma construtora, para apresentar formalmente a um cliente.\n\n" +
    "Dados da obra:\n" +
    `- Projeto: ${input.obraNome}\n` +
    `- Cliente: ${input.clienteNome}\n` +
    `- Endereço: ${input.endereco}\n\n` +
    (input.itensLength > 0
      ? "Itens orçados por etapa (fonte interna — não copie quantidades/unidades literalmente no " +
        "texto, mas USE os materiais e serviços mencionados neles para escrever cada demanda):\n" +
        input.etapasResumo
      : "Não há itens de orçamento cadastrados — baseie o escopo inteiramente nos documentos/plantas " +
        "do projeto anexados abaixo.") +
    (input.documentosLength > 0 && input.itensLength > 0
      ? "\n\nOs documentos/plantas do projeto anexados acima também devem ser considerados para descrever o escopo com precisão."
      : "") +
    "\n\nRedija um escopo de serviços formal, claro e comercial, em português, organizado por etapa. " +
    "Para cada etapa, emita SOMENTE a lista de itens de \"Demandas Necessárias\" — NÃO escreva nenhum " +
    "parágrafo de descrição adicional depois da lista de itens.\n\n" +
    "Regras OBRIGATÓRIAS para cada item da lista:\n" +
    "1. Comece SEMPRE com um verbo de ação no infinitivo (ex.: Executar, Instalar, Adequar, Fornecer, " +
    "Aplicar, Montar, Substituir, Revisar). NUNCA comece com um substantivo ou com \"Disponibilizar " +
    "suporte/consultoria\".\n" +
    "2. Cite especificamente os materiais e/ou serviços envolvidos, com base SOMENTE nos itens orçados " +
    "e/ou documentos anexados dessa etapa (ex.: \"Instalar revestimento cerâmico porcelanato nas paredes " +
    "do banheiro\", não apenas \"Instalar revestimentos\").\n" +
    "3. NUNCA invente ou generalize itens que não estejam explicitamente nos dados fornecidos — " +
    "proibido incluir frases genéricas de preenchimento como \"cobrir despesas extras não previstas " +
    "inicialmente\", \"disponibilizar suporte jurídico\", \"disponibilizar suporte financeiro\", " +
    "\"consultoria técnica internacional\", ou qualquer serviço/equipe/software que não tenha sido " +
    "citado nos itens orçados ou documentos anexados. Se uma etapa tiver poucos itens reais, é preferível " +
    "uma lista curta e verdadeira a completá-la com itens inventados.\n" +
    "4. NÃO inclua nenhum valor monetário no texto — o investimento total já é exibido separadamente no " +
    "documento final.\n\n" +
    "NÃO escreva nenhum parágrafo de apresentação ou introdução antes das etapas — o documento vai " +
    "direto das etapas, sem introdução.\n\n" +
    "Use a ferramenta emitir_escopo para entregar o resultado."
  );
}

async function chamarEmitirEscopo(
  apiKey: string,
  documentos: DocumentoEnviado[],
  promptTexto: string,
  maxTokens: number
): Promise<{ ok: true; json: Record<string, unknown> } | { ok: false; pdfError: boolean; error: string }> {
  const content: Record<string, unknown>[] = documentos.map((doc) => ({
    type: doc.mediaType === "application/pdf" ? "document" : "image",
    source: { type: "file", file_id: doc.fileId },
  }));
  content.push({ type: "text", text: promptTexto });

  const res = await fetch(ANTHROPIC_ENDPOINT, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": FILES_BETA_HEADER,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      tools: [EMITIR_ESCOPO_TOOL],
      tool_choice: { type: "tool", name: "emitir_escopo" },
      messages: [{ role: "user", content }],
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    return { ok: false, pdfError: txt.includes("Could not process PDF"), error: txt };
  }
  return { ok: true, json: await res.json() };
}

function extrairResultado(json: Record<string, unknown>): { ok: true; data: EscopoGerado } | { ok: false; error: string } {
  const toolUse = ((json?.content as Record<string, unknown>[]) ?? []).find(
    (b) => b.type === "tool_use" && b.name === "emitir_escopo"
  );

  if (!toolUse) {
    const motivo =
      json?.stop_reason === "max_tokens"
        ? "a resposta foi cortada por exceder o limite de tokens"
        : `nenhuma chamada de ferramenta na resposta (stop_reason: ${json?.stop_reason ?? "desconhecido"})`;
    return {
      ok: false,
      error: `Não foi possível interpretar a resposta (${motivo}). Tente novamente.`,
    };
  }

  const parsed = (toolUse as Record<string, unknown>).input as Record<string, unknown>;
  const etapas = Array.isArray(parsed.etapas)
    ? parsed.etapas.map((e: Record<string, unknown>) => ({
        nome: typeof e.nome === "string" ? e.nome : "",
        itens: Array.isArray(e.itens) ? e.itens.map((i: unknown) => String(i)) : [],
      }))
    : [];

  return {
    ok: true,
    data: {
      etapas,
      prazoEstimado: typeof parsed.prazoEstimado === "string" ? parsed.prazoEstimado : null,
      condicoes: typeof parsed.condicoes === "string" ? parsed.condicoes : "",
    },
  };
}

export async function gerarEscopoOrcamento(input: {
  obraNome: string;
  clienteNome: string;
  endereco: string;
  valorVenda: number;
  itens: { etapa: string; descricao: string; quantidade: number; unidade: string }[];
  documentos: { buffer: Buffer; mediaType: string; nomeOriginal: string }[];
}): Promise<{ ok: true; data: EscopoGerado } | { ok: false; error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: "ANTHROPIC_API_KEY não configurada." };

  const porEtapa = new Map<string, string[]>();
  for (const item of input.itens) {
    const lista = porEtapa.get(item.etapa) ?? [];
    lista.push(`${item.descricao} (${item.quantidade} ${item.unidade})`);
    porEtapa.set(item.etapa, lista);
  }
  const etapasResumo = Array.from(porEtapa.entries())
    .map(([etapa, itens]) => `- ${etapa}:\n  ${itens.join("\n  ")}`)
    .join("\n");

  // Envia os documentos pela Files API (em vez de embutir em base64 na
  // mensagem) — mais robusto para PDFs grandes/escaneados, que às vezes
  // falhavam com "Could not process PDF" quando embutidos diretamente.
  const enviados: DocumentoEnviado[] = [];
  for (const doc of input.documentos) {
    try {
      const fileId = await uploadArquivoAnthropic(apiKey, doc.buffer, doc.mediaType, doc.nomeOriginal);
      enviados.push({ mediaType: doc.mediaType, fileId, nomeOriginal: doc.nomeOriginal });
    } catch {
      // Se um documento específico falhar ao enviar, segue sem ele em vez de travar tudo.
      continue;
    }
  }

  const promptTexto = montarPrompt({
    obraNome: input.obraNome,
    clienteNome: input.clienteNome,
    endereco: input.endereco,
    itensLength: input.itens.length,
    documentosLength: input.documentos.length,
    etapasResumo,
  });

  try {
    const primeira = await chamarEmitirEscopo(apiKey, enviados, promptTexto, 8000);
    if (primeira.ok) {
      return extrairResultado(primeira.json);
    }
    if (!primeira.pdfError) {
      return { ok: false, error: `Anthropic: ${primeira.error.slice(0, 200)}` };
    }

    // Algum documento não pôde ser processado — testa cada um individualmente
    // (chamada rápida/barata) pra isolar o(s) culpado(s) e gerar mesmo assim
    // com os documentos que funcionam, em vez de falhar tudo.
    const bons: DocumentoEnviado[] = [];
    const ignorados: string[] = [];
    for (const doc of enviados) {
      const teste = await chamarEmitirEscopo(
        apiKey,
        [doc],
        "Apenas confirme que conseguiu ler este documento chamando a ferramenta com um resumo mínimo.",
        200
      );
      if (teste.ok) {
        bons.push(doc);
      } else {
        ignorados.push(doc.nomeOriginal);
      }
    }

    if (bons.length === 0 && ignorados.length > 0) {
      return {
        ok: false,
        error:
          `Não foi possível ler nenhum dos documentos anexados (${ignorados.join(", ")}). ` +
          "Eles podem estar corrompidos, protegidos por senha ou em um formato não suportado. " +
          "Tente reexportar/reenviar os arquivos, ou remova-os e gere o escopo novamente.",
      };
    }

    const segunda = await chamarEmitirEscopo(apiKey, bons, promptTexto, 8000);
    if (!segunda.ok) {
      return { ok: false, error: `Anthropic: ${segunda.error.slice(0, 200)}` };
    }
    const resultado = extrairResultado(segunda.json);
    if (resultado.ok && ignorados.length > 0) {
      resultado.data.documentosIgnorados = ignorados;
    }
    return resultado;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao gerar escopo." };
  } finally {
    for (const doc of enviados) {
      await deletarArquivoAnthropic(apiKey, doc.fileId);
    }
  }
}
