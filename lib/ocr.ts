// Leitura de notas fiscais via Claude (Anthropic API), extraindo valor/data/descrição.

import { uploadArquivoAnthropic, deletarArquivoAnthropic, FILES_BETA_HEADER } from "./anthropic-files";

const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";

export type NotaExtraida = {
  valor: number | null;
  data: string | null; // YYYY-MM-DD
  descricao: string | null;
  fornecedor: string | null;
  categoriaNome: string | null;
};

export type ParcelaExtraida = {
  descricao: string;
  valor: number;
  data: string | null; // YYYY-MM-DD, ou null se não deu pra estimar
};

export async function lerNotaFiscal(
  imageBase64: string,
  mediaType: string,
  categoriasDisponiveis: string[] = []
): Promise<{ ok: true; data: NotaExtraida } | { ok: false; error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: "ANTHROPIC_API_KEY não configurada." };

  const listaCategorias =
    categoriasDisponiveis.length > 0
      ? `\n\nCategorias disponíveis (escolha a que melhor corresponde, ou null se nenhuma se aplicar): ${categoriasDisponiveis
          .map((c) => `"${c}"`)
          .join(", ")}.`
      : "";

  try {
    const res = await fetch(ANTHROPIC_ENDPOINT, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: imageBase64 },
              },
              {
                type: "text",
                text:
                  "Esta é uma foto de nota fiscal, recibo ou comprovante de compra de uma obra de construção civil. " +
                  "Extraia o valor TOTAL pago, a data do documento, o nome do fornecedor/emissor, e uma descrição " +
                  "curta dos principais itens. Também identifique a categoria do gasto." +
                  listaCategorias +
                  "\nResponda APENAS com um JSON válido no formato exato: " +
                  '{"valor": <número decimal ou null>, "data": "<YYYY-MM-DD ou null>", "descricao": "<texto curto ou null>", ' +
                  '"fornecedor": "<nome do fornecedor/emissor ou null>", "categoriaNome": "<uma das categorias disponíveis, ou null>"}. ' +
                  "Não inclua nenhum texto além do JSON.",
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, error: `Anthropic ${res.status}: ${txt.slice(0, 200)}` };
    }

    const json = await res.json();
    const text: string = json?.content?.[0]?.text ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { ok: false, error: "Não foi possível interpretar a resposta." };

    const parsed = JSON.parse(match[0]);
    return {
      ok: true,
      data: {
        valor: typeof parsed.valor === "number" ? parsed.valor : null,
        data: typeof parsed.data === "string" ? parsed.data : null,
        descricao: typeof parsed.descricao === "string" ? parsed.descricao : null,
        fornecedor: typeof parsed.fornecedor === "string" ? parsed.fornecedor : null,
        categoriaNome: typeof parsed.categoriaNome === "string" ? parsed.categoriaNome : null,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao ler a nota." };
  }
}

export async function lerFluxoPagamentosContrato(
  buffer: Buffer,
  mediaType: string
): Promise<{ ok: true; data: ParcelaExtraida[] } | { ok: false; error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: "ANTHROPIC_API_KEY não configurada." };

  const isPdf = mediaType === "application/pdf";
  if (!isPdf && !mediaType.startsWith("image/")) {
    return { ok: false, error: "Envie o contrato como PDF ou imagem para leitura automática." };
  }

  const hoje = new Date().toISOString().slice(0, 10);

  // Envia o arquivo pela API de arquivos da Anthropic (até 500MB) em vez de
  // embutir em base64 na mensagem — o corpo da requisição de mensagens tem
  // limite de 32MB, que um contrato em PDF escaneado facilmente ultrapassa.
  let fileId: string;
  try {
    fileId = await uploadArquivoAnthropic(apiKey, buffer, mediaType, isPdf ? "contrato.pdf" : "contrato");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao enviar o arquivo para a IA." };
  }

  try {
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
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: isPdf ? "document" : "image",
                source: { type: "file", file_id: fileId },
              },
              {
                type: "text",
                text:
                  "Este é um contrato de prestação de serviços de obra/reforma. Encontre o fluxo de pagamentos " +
                  "previsto (entrada, parcelas, sinal, saldo na entrega, parcelas mensais, etc.) e extraia cada " +
                  "parcela como um item. Para a data: se o contrato tiver uma data-base (assinatura, início da obra) " +
                  `e prazos relativos ("30 dias após assinatura"), calcule a data absoluta considerando hoje como ${hoje} ` +
                  "se não houver data-base explícita. Se realmente não for possível estimar uma data, use null. " +
                  "Responda APENAS com um JSON válido, um array no formato exato: " +
                  '[{"descricao": "<texto curto, ex: Entrada, Parcela 1/3>", "valor": <número decimal>, "data": "<YYYY-MM-DD ou null>"}, ...]. ' +
                  "Se não encontrar nenhum fluxo de pagamento no documento, responda com um array vazio []. " +
                  "Não inclua nenhum texto além do JSON.",
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, error: `Anthropic ${res.status}: ${txt.slice(0, 200)}` };
    }

    const json = await res.json();
    const text: string = json?.content?.[0]?.text ?? "";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return { ok: false, error: "Não foi possível interpretar a resposta." };

    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return { ok: false, error: "Resposta em formato inesperado." };

    const itens: ParcelaExtraida[] = parsed
      .filter((it) => typeof it.valor === "number" && it.valor > 0)
      .map((it) => ({
        descricao: typeof it.descricao === "string" && it.descricao ? it.descricao : "Parcela",
        valor: it.valor,
        data: typeof it.data === "string" ? it.data : null,
      }));

    return { ok: true, data: itens };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao ler o contrato." };
  } finally {
    await deletarArquivoAnthropic(apiKey, fileId);
  }
}
