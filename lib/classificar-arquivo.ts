// Classificação automática de arquivos da obra por tipo (foto, projeto,
// contrato, relatório, documento). Primeiro tenta pelo tipo/nome do arquivo
// (grátis e instantâneo); só PDFs que continuam ambíguos passam pela IA.

import type { ArquivoCategoria } from "./types";

const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";
const LIMITE_PDF_IA = 10 * 1024 * 1024;

const sem = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function ehMidia(mimeType: string) {
  return mimeType.startsWith("image/") || mimeType.startsWith("video/");
}

// Resposta imediata quando o tipo ou o nome já deixam claro; null = ambíguo.
export function classificarPorNome(nome: string, mimeType: string): ArquivoCategoria | null {
  if (ehMidia(mimeType)) return "foto";
  const n = sem(nome);
  if (/\.(dwg|dxf|rvt|skp|ifc)$/.test(n)) return "projeto";
  if (/contrat|aditivo|proposta/.test(n)) return "contrato";
  if (/relatorio|medicao|diario/.test(n)) return "relatorio";
  if (/planta|projeto|memorial|detalhamento|compatibiliza|layout|fachada|corte|elevacao|hidraulic|eletric|estrutural|climatiza|executivo|prancha/.test(n))
    return "projeto";
  if (/\bart\b|\brrt\b|alvara|licenca|habite|crea|cau\b|certidao|matricula|iptu|\bcnd\b/.test(n))
    return "documento";
  return null;
}

async function classificarPdfComIA(buffer: Buffer, nome: string): Promise<ArquivoCategoria | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || buffer.length > LIMITE_PDF_IA) return null;
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
        max_tokens: 20,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: buffer.toString("base64") },
              },
              {
                type: "text",
                text:
                  `Este PDF (nome: "${nome}") pertence a uma obra de construção civil. Classifique em UMA categoria:\n` +
                  "- projeto: plantas, desenhos técnicos, memorial descritivo, projetos de arquitetura/engenharia/instalações\n" +
                  "- contrato: contratos, aditivos, propostas comerciais, termos\n" +
                  "- relatorio: relatórios de obra, medições, diários\n" +
                  "- documento: ART/RRT, alvarás, licenças, certidões, notas fiscais, boletos, comprovantes e demais documentos\n" +
                  "Responda APENAS com a palavra da categoria.",
              },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const texto = sem(String(json?.content?.[0]?.text ?? ""));
    for (const c of ["projeto", "contrato", "relatorio", "documento"] as const) {
      if (texto.includes(c)) return c;
    }
    return null;
  } catch {
    return null;
  }
}

export async function classificarArquivo(a: {
  nome: string;
  mimeType: string;
  // Só é chamado se a IA for necessária (evita baixar PDFs à toa).
  lerBytes?: () => Promise<Buffer | null>;
}): Promise<ArquivoCategoria> {
  const rapido = classificarPorNome(a.nome, a.mimeType);
  if (rapido) return rapido;
  if (a.mimeType === "application/pdf" && a.lerBytes) {
    const bytes = await a.lerBytes();
    if (bytes) {
      const ia = await classificarPdfComIA(bytes, a.nome);
      if (ia) return ia;
    }
  }
  return "documento";
}
