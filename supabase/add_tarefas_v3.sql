-- Tarefas, parte 3: mais de um responsável por tarefa.
-- Guarda a lista de responsáveis em tarefas.responsaveis e copia o responsável
-- atual de cada tarefa para a nova lista.
-- Rode este script inteiro no SQL Editor do Supabase (depois do add_tarefas_v2.sql).

alter table public.tarefas
  add column if not exists responsaveis uuid[] not null default '{}';

update public.tarefas
  set responsaveis = array[responsavel_id]
  where responsavel_id is not null and responsaveis = '{}';

create index if not exists tarefas_responsaveis_idx on public.tarefas using gin (responsaveis);
