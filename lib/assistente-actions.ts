"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import { podeUsarAssistente } from "./recursos";
import { carregarContexto, normalizarAcao } from "./assistente";
import {
  createDataImportanteAction,
  createLancamentoAvulsoAction,
  createPagamentoAction,
  updatePagamentoRecebidoAction,
} from "./actions";
import { mudarStatusTarefaAction, salvarTarefaAction } from "./tarefa-actions";
import { createClient } from "./supabase/server";

export type ResultadoAcao = { ok: true; mensagem: string; link?: string } | { ok: false; error: string };

// Executa uma ação que o usuário confirmou no chat. Revalida tudo do zero (permissões e dados)
// e reaproveita as mesmas ações das telas do sistema, então valem as mesmas regras e avisos.
export async function executarAcaoAssistenteAction(tipo: string, dados: Record<string, unknown>): Promise<ResultadoAcao> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!podeUsarAssistente(user)) return { ok: false, error: "Você não tem acesso ao assistente." };

  const ctx = await carregarContexto(user);
  const norm = await normalizarAcao(tipo, dados ?? {}, ctx);
  if (!norm.ok) return { ok: false, error: norm.erro };
  const d = norm.dados;

  try {
    switch (tipo) {
      case "criar_tarefa": {
        const lista = d.lista as string;
        const res = await salvarTarefaAction({
          obraId: (d.obra_id as string) || null,
          titulo: d.titulo as string,
          descricao: d.descricao as string,
          prioridade: d.prioridade as string,
          responsavelIds: d.responsavel_ids as string[],
          prazo: (d.prazo as string | null) ?? null,
          recorrencia: d.recorrencia as string,
          pessoal: lista === "pessoal",
          gestao: lista === "gestao",
          checklist: d.checklist as string[],
        });
        if (res.error || !res.id) return { ok: false, error: res.error ?? "Não foi possível criar a tarefa." };
        const aba = lista === "pessoal" ? "&aba=pessoais" : lista === "gestao" ? "&aba=gestao" : "";
        return { ok: true, mensagem: "Tarefa criada.", link: `/tarefas?tarefa=${res.id}${aba}` };
      }

      case "mudar_status_tarefa": {
        const res = await mudarStatusTarefaAction(d.tarefa_id as string, d.status as string);
        if (res.error) return { ok: false, error: res.error };
        return { ok: true, mensagem: "Tarefa atualizada.", link: `/tarefas?tarefa=${d.tarefa_id as string}` };
      }

      case "lancar_gasto": {
        const fd = new FormData();
        fd.set("obraId", d.obra_id as string);
        fd.set("categoriaId", d.categoria_id as string);
        fd.set("fornecedor", d.fornecedor as string);
        fd.set("valor", String(d.valor));
        fd.set("descricao", d.descricao as string);
        fd.set("data", d.data as string);
        fd.set("setor", d.setor as string);
        const res = await createLancamentoAvulsoAction(undefined, fd);
        if (res.error) return { ok: false, error: res.error };
        return { ok: true, mensagem: "Gasto lançado.", link: `/obras/${d.obra_id as string}` };
      }

      case "lancar_pagamento": {
        const fd = new FormData();
        fd.set("descricao", d.descricao as string);
        fd.set("valor", String(d.valor));
        fd.set("dataPrevista", d.data_prevista as string);
        if (d.recebido === true) fd.set("recebido", "on");
        const res = await createPagamentoAction(d.obra_id as string, undefined, fd);
        if (res.error) return { ok: false, error: res.error };
        return { ok: true, mensagem: "Pagamento lançado.", link: `/obras/${d.obra_id as string}?aba=pagamentos` };
      }

      case "marcar_pagamento": {
        const supabase = await createClient();
        const { data } = await supabase.from("pagamentos").select("obra_id").eq("id", d.pagamento_id as string).maybeSingle();
        if (!data) return { ok: false, error: "Pagamento não encontrado." };
        await updatePagamentoRecebidoAction(String(data.obra_id), d.pagamento_id as string, d.recebido === true);
        return { ok: true, mensagem: d.recebido === true ? "Pagamento marcado como recebido." : "Pagamento voltou para pendente." };
      }

      case "criar_data_importante": {
        const fd = new FormData();
        fd.set("titulo", d.titulo as string);
        fd.set("descricao", d.descricao as string);
        fd.set("data", d.data as string);
        fd.set("alertaDiasAntes", String(d.alerta_dias_antes));
        if (d.recorrente === true) fd.set("recorrente", "on");
        const res = await createDataImportanteAction(undefined, fd);
        if (res.error) return { ok: false, error: res.error };
        return { ok: true, mensagem: "Data importante criada.", link: "/datas-importantes" };
      }

      default:
        return { ok: false, error: "Ação desconhecida." };
    }
  } catch (e) {
    // Um redirect (ex.: sessão expirada) não é erro: deixa o Next tratar.
    if (String((e as { digest?: unknown })?.digest ?? "").startsWith("NEXT_REDIRECT")) throw e;
    return { ok: false, error: e instanceof Error ? e.message : "Não foi possível executar a ação." };
  }
}
