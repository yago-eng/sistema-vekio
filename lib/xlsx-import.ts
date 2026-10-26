import * as XLSX from "xlsx";
import type { OrcamentoTipo } from "./types";

export type ParsedOrcamentoItem = {
  tipo: OrcamentoTipo;
  etapa: string;
  descricao: string;
  valorUnitario: number;
  quantidade: number;
  unidade: string;
  valorTotal: number;
  observacao: string;
};

const HEADER_ALIASES: Record<string, string> = {
  "serviço": "etapa",
  "servico": "etapa",
  "etapa": "etapa",
  "material": "material",
  "equipe": "equipe",
  "valor": "valorUnitario",
  "valor unit": "valorUnitario",
  "valor unitário": "valorUnitario",
  "quant.": "quantidade",
  "quant": "quantidade",
  "quantidade": "quantidade",
  "und.": "unidade",
  "und": "unidade",
  "unidade": "unidade",
  "valor total": "valorTotal",
  "observação": "observacao",
  "observacao": "observacao",
};

function parseCurrency(raw: unknown): number {
  const v = String(raw ?? "").trim();
  if (!v || v === "-") return 0;
  const cleaned = v.replace(/[^0-9.,-]/g, "").replace(/,/g, "");
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function parseQuantidade(raw: unknown): number {
  const v = String(raw ?? "").trim();
  if (!v || v === "-") return 0;
  const num = parseFloat(v.replace(",", "."));
  return Number.isFinite(num) ? num : 0;
}

function normalizeHeader(h: unknown): string {
  return String(h ?? "").trim().toLowerCase();
}

function findHeaderRow(rows: unknown[][]): number {
  return rows.findIndex((row) =>
    row.some((cell) => normalizeHeader(cell) === "serviço" || normalizeHeader(cell) === "servico")
  );
}

/**
 * Analisa uma planilha de orçamento (padrão Vekio: abas "Material" e
 * "Mão de Obra", colunas Serviço/Material ou Equipe/Valor/Quant./Und./Valor Total).
 * Abas que não seguem esse padrão (ex: resumos de margem) são ignoradas.
 */
export function parseOrcamentoWorkbook(buffer: ArrayBuffer): ParsedOrcamentoItem[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const itens: ParsedOrcamentoItem[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "" });

    const headerIdx = findHeaderRow(rows);
    if (headerIdx === -1) continue;

    const headerRow = rows[headerIdx];
    const colMap = new Map<number, string>();
    headerRow.forEach((cell, idx) => {
      const key = HEADER_ALIASES[normalizeHeader(cell)];
      if (key) colMap.set(idx, key);
    });

    const hasMaterial = Array.from(colMap.values()).includes("material");
    const hasEquipe = Array.from(colMap.values()).includes("equipe");
    if (!hasMaterial && !hasEquipe) continue; // não é uma aba de orçamento reconhecível

    const tipo: OrcamentoTipo = hasMaterial ? "material" : "mao_de_obra";
    const descricaoKey = hasMaterial ? "material" : "equipe";

    let currentEtapa = "";
    let consecutiveEmpty = 0;

    for (let r = headerIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      const get = (key: string) => {
        for (const [idx, mapped] of colMap) {
          if (mapped === key) return row[idx];
        }
        return "";
      };

      const etapaCell = String(get("etapa") ?? "").trim();
      const descricaoCell = String(get(descricaoKey) ?? "").trim();
      const valorTotalCell = String(get("valorTotal") ?? "").trim();

      const rowIsEmpty = !etapaCell && !descricaoCell && !valorTotalCell;
      if (rowIsEmpty) {
        consecutiveEmpty++;
        if (consecutiveEmpty > 8) break;
        continue;
      }
      consecutiveEmpty = 0;

      if (etapaCell) currentEtapa = etapaCell;

      // linha de subtotal do grupo: sem descrição, só valor total
      if (!descricaoCell || descricaoCell === "-") {
        if (descricaoCell !== "-") continue;
      }

      const descricao = descricaoCell && descricaoCell !== "-" ? descricaoCell : currentEtapa;
      if (!descricao) continue;

      const valorUnitario = parseCurrency(get("valorUnitario"));
      const quantidade = parseQuantidade(get("quantidade"));
      const valorTotal = valorTotalCell ? parseCurrency(valorTotalCell) : valorUnitario * quantidade;
      if (valorTotal === 0 && valorUnitario === 0) continue;

      itens.push({
        tipo,
        etapa: currentEtapa || "Geral",
        descricao,
        valorUnitario,
        quantidade,
        unidade: String(get("unidade") ?? "").trim(),
        valorTotal,
        observacao: String(get("observacao") ?? "").trim(),
      });
    }
  }

  return itens;
}

export type ParsedOrcamentoParametros = {
  margemVekio: number;
  rt: number;
  imposto: number;
  lucratividadeEsperada: number;
};

function normalizeLabel(v: unknown): string {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/^[+=]\s*/, "");
}

function findPercentInRow(row: unknown[]): number | null {
  for (const cell of row) {
    const s = String(cell ?? "").trim();
    const match = s.match(/^-?\d+(?:[.,]\d+)?%$/);
    if (match) return parseFloat(s.replace(",", ".").replace("%", ""));
  }
  return null;
}

/**
 * Procura, em qualquer aba, as linhas de precificação (Margem Vekio, RT,
 * Imposto, Lucratividade esperada) e extrai os percentuais configurados.
 * Retorna null se a planilha não tiver esse bloco (formato antigo, sem
 * calculadora de precificação).
 */
export function parseOrcamentoParametros(buffer: ArrayBuffer): ParsedOrcamentoParametros | null {
  const workbook = XLSX.read(buffer, { type: "array" });
  const found: Partial<ParsedOrcamentoParametros> = {};

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "" });

    for (const row of rows) {
      for (const cell of row) {
        const label = normalizeLabel(cell);
        if (!label) continue;
        const pct = findPercentInRow(row);
        if (pct === null) continue;

        if (label.includes("margem vekio")) found.margemVekio = pct;
        else if (label === "rt") found.rt = pct;
        else if (label.includes("imposto")) found.imposto = pct;
        else if (label.includes("lucratividade esperada")) found.lucratividadeEsperada = pct;
      }
    }
  }

  if (Object.keys(found).length === 0) return null;
  return {
    margemVekio: found.margemVekio ?? 0,
    rt: found.rt ?? 0,
    imposto: found.imposto ?? 0,
    lucratividadeEsperada: found.lucratividadeEsperada ?? 0,
  };
}
