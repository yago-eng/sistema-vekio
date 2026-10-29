#!/usr/bin/env node
// Backup do Sistema Vekio: banco de dados (JSON por tabela) + arquivos do Storage.
// Sem dependências. Roda com Node 18+:  node scripts/backup-vekio.mjs
//
// Configuração em ~/.vekio-backup.env (fora do projeto, nunca vai pro GitHub):
//   SUPABASE_URL=https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=...
//   BACKUP_DIR=/Users/.../GoogleDrive-.../Meu Drive/Sistema Vekio   (opcional)

import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BUCKET = "arquivos";
const PAGINA = 1000;
const DOWNLOADS_EM_PARALELO = 4;
const SNAPSHOTS_MANTIDOS = 12;
const TABELAS_FALLBACK = [
  "arquivos", "categorias", "cliente_obras", "custos_fixos", "datas_importantes", "etapas",
  "lancamentos", "lembretes", "notificacoes", "notificacoes_lidas", "obra_acessos",
  "obra_aditivos", "obras", "orcamento_escopos", "orcamento_itens", "orcamento_parametros",
  "orcamentos", "pagamentos", "profiles", "push_subscriptions", "relatorios_obra",
];

const raizProjeto = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function lerConfig() {
  const arquivo = path.join(os.homedir(), ".vekio-backup.env");
  let texto;
  try {
    texto = await fs.readFile(arquivo, "utf8");
  } catch {
    throw new Error(`Configuração não encontrada em ${arquivo}. Rode scripts/configurar-backup.sh primeiro.`);
  }
  const cfg = {};
  for (const linha of texto.split("\n")) {
    const m = linha.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m) cfg[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente em ~/.vekio-backup.env");
  }
  cfg.SUPABASE_URL = cfg.SUPABASE_URL.replace(/\/+$/, "");
  return cfg;
}

const cfg = await lerConfig();
// Chaves novas (sb_secret_...) não são JWT: vão só no apikey. A chave antiga (JWT) também vai em Authorization.
const auth = { apikey: cfg.SUPABASE_SERVICE_ROLE_KEY };
if (cfg.SUPABASE_SERVICE_ROLE_KEY.startsWith("eyJ")) auth.Authorization = `Bearer ${cfg.SUPABASE_SERVICE_ROLE_KEY}`;

const destino =
  cfg.BACKUP_DIR ||
  path.join(os.homedir(), "Library/CloudStorage/GoogleDrive-yago@vekio.co/Meu Drive/Sistema Vekio");

const agora = new Date();
const pad = (n) => String(n).padStart(2, "0");
const carimbo = `${agora.getFullYear()}-${pad(agora.getMonth() + 1)}-${pad(agora.getDate())}_${pad(agora.getHours())}${pad(agora.getMinutes())}`;

async function req(url, init = {}, tentativas = 3) {
  let ultimo;
  for (let i = 1; i <= tentativas; i++) {
    let definitivo = false;
    try {
      const res = await fetch(url, { ...init, headers: { ...auth, ...(init.headers ?? {}) } });
      if (res.ok) return res;
      ultimo = new Error(`${res.status} ${res.statusText} em ${url.replace(cfg.SUPABASE_URL, "")}`);
      definitivo = res.status < 500 && res.status !== 429;
    } catch (e) {
      ultimo = e;
    }
    if (definitivo) break;
    await new Promise((r) => setTimeout(r, 1000 * i));
  }
  throw ultimo;
}

async function listarTabelas() {
  try {
    const res = await req(`${cfg.SUPABASE_URL}/rest/v1/`);
    const doc = await res.json();
    const nomes = Object.keys(doc.definitions ?? {});
    if (nomes.length) return nomes.sort();
  } catch {}
  return TABELAS_FALLBACK;
}

async function baixarTabela(tabela) {
  const linhas = [];
  for (let de = 0; ; de += PAGINA) {
    const res = await req(`${cfg.SUPABASE_URL}/rest/v1/${tabela}?select=*`, {
      headers: { "Range-Unit": "items", Range: `${de}-${de + PAGINA - 1}`, Prefer: "count=none" },
    });
    const lote = await res.json();
    linhas.push(...lote);
    if (lote.length < PAGINA) break;
  }
  return linhas;
}

async function listarStorage(prefixo = "") {
  const achados = [];
  for (let offset = 0; ; offset += PAGINA) {
    const res = await req(`${cfg.SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: prefixo, limit: PAGINA, offset, sortBy: { column: "name", order: "asc" } }),
    });
    const itens = await res.json();
    for (const it of itens) {
      const caminho = prefixo ? `${prefixo}/${it.name}` : it.name;
      if (it.id === null) achados.push(...(await listarStorage(caminho)));
      else achados.push({ caminho, tamanho: it.metadata?.size ?? null });
    }
    if (itens.length < PAGINA) break;
  }
  return achados;
}

async function backupBanco(pastaSnapshot) {
  await fs.mkdir(pastaSnapshot, { recursive: true });
  const resumo = {};
  for (const tabela of await listarTabelas()) {
    const linhas = await baixarTabela(tabela);
    await fs.writeFile(path.join(pastaSnapshot, `${tabela}.json`), JSON.stringify(linhas, null, 1));
    resumo[tabela] = linhas.length;
  }
  return resumo;
}

async function limparSnapshotsAntigos(pastaBanco) {
  const nomes = (await fs.readdir(pastaBanco)).filter((n) => /^\d{4}-\d{2}-\d{2}_\d{4}$/.test(n)).sort();
  for (const antigo of nomes.slice(0, Math.max(0, nomes.length - SNAPSHOTS_MANTIDOS))) {
    await fs.rm(path.join(pastaBanco, antigo), { recursive: true, force: true });
  }
}

async function backupArquivos(pastaArquivos) {
  const lista = await listarStorage();
  let novos = 0;
  let jaTinha = 0;
  let falhas = 0;
  let bytes = 0;
  let proximo = 0;

  async function trabalhador() {
    while (proximo < lista.length) {
      const item = lista[proximo++];
      const alvo = path.join(pastaArquivos, ...item.caminho.split("/"));
      try {
        const existente = await fs.stat(alvo).catch(() => null);
        if (existente && (item.tamanho === null || existente.size === item.tamanho)) {
          jaTinha++;
          continue;
        }
        const url = `${cfg.SUPABASE_URL}/storage/v1/object/${BUCKET}/${item.caminho.split("/").map(encodeURIComponent).join("/")}`;
        const buf = Buffer.from(await (await req(url)).arrayBuffer());
        await fs.mkdir(path.dirname(alvo), { recursive: true });
        await fs.writeFile(alvo, buf);
        novos++;
        bytes += buf.length;
      } catch (e) {
        falhas++;
        console.error(`  falhou: ${item.caminho} (${e.message})`);
      }
    }
  }
  await Promise.all(Array.from({ length: DOWNLOADS_EM_PARALELO }, trabalhador));
  return { total: lista.length, novos, jaTinha, falhas, bytes };
}

async function copiarEsquema(pastaEsquema) {
  const origem = path.join(raizProjeto, "supabase");
  try {
    await fs.mkdir(pastaEsquema, { recursive: true });
    for (const nome of await fs.readdir(origem)) {
      if (nome.endsWith(".sql")) await fs.copyFile(path.join(origem, nome), path.join(pastaEsquema, nome));
    }
  } catch (e) {
    console.error(`  esquema SQL não copiado (${e.message})`);
  }
}

const LEIA_ME = `BACKUP DO SISTEMA VEKIO
=======================

Esta pasta é uma cópia de segurança do Sistema Vekio, gerada automaticamente.

  banco/AAAA-MM-DD_HHMM/   Uma pasta por backup, com todas as tabelas em arquivos .json
                           (obras, lançamentos, pagamentos, clientes, orçamentos, etc.).
                           São mantidos os ${SNAPSHOTS_MANTIDOS} mais recentes.
  arquivos/                Todos os arquivos enviados (fotos, PDFs, notas fiscais), com a mesma
                           estrutura de pastas do sistema. Nada daqui é apagado pelo backup.
  esquema/                 Os scripts SQL que criam a estrutura do banco de dados.
  ultimo-backup.txt        Resumo do último backup (data, quantidades, erros).

O código do sistema fica no GitHub (repositório privado yago-eng/sistema-vekio).
Para reconstruir: código (GitHub) + esquema/ (criar as tabelas) + banco/ (dados) + arquivos/.
`;

const inicio = Date.now();
console.log(`Backup Vekio ${carimbo} -> ${destino}`);
await fs.mkdir(destino, { recursive: true });

const pastaBanco = path.join(destino, "banco");
const resumoBanco = await backupBanco(path.join(pastaBanco, carimbo));
await limparSnapshotsAntigos(pastaBanco);
const totalLinhas = Object.values(resumoBanco).reduce((a, b) => a + b, 0);
console.log(`  banco: ${Object.keys(resumoBanco).length} tabelas, ${totalLinhas} registros`);

const arq = await backupArquivos(path.join(destino, "arquivos"));
console.log(`  arquivos: ${arq.total} no sistema, ${arq.novos} baixados agora, ${arq.jaTinha} já estavam, ${arq.falhas} falhas`);

await copiarEsquema(path.join(destino, "esquema"));
await fs.writeFile(path.join(destino, "LEIA-ME.txt"), LEIA_ME);

const mb = (arq.bytes / 1024 / 1024).toFixed(1);
const status = arq.falhas ? "CONCLUÍDO COM FALHAS" : "OK";
await fs.writeFile(
  path.join(destino, "ultimo-backup.txt"),
  [
    `Status: ${status}`,
    `Data: ${agora.toLocaleString("pt-BR")}`,
    `Banco: ${Object.keys(resumoBanco).length} tabelas, ${totalLinhas} registros`,
    `Arquivos: ${arq.total} no sistema; ${arq.novos} novos (${mb} MB); ${arq.jaTinha} já salvos; ${arq.falhas} falhas`,
    `Duração: ${Math.round((Date.now() - inicio) / 1000)}s`,
    "",
  ].join("\n"),
);

console.log(`${status} em ${Math.round((Date.now() - inicio) / 1000)}s`);
if (arq.falhas) process.exit(2);
