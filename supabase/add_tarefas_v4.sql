-- Tarefas, parte 4: lista "Gestão" (tarefas da gestão da empresa, sem obra).
-- gestao = true => só administradores enxergam e mexem na tarefa.
-- Rode este script inteiro no SQL Editor do Supabase (depois do add_tarefas_v3.sql).

alter table public.tarefas
  add column if not exists gestao boolean not null default false;

create index if not exists tarefas_gestao_idx on public.tarefas (created_at) where gestao;

-- Regras de acesso: equipe vê as tarefas comuns; as pessoais só o dono; as de
-- gestão só admin. Checklist, anexos e comentários herdam isso pelas políticas
-- já criadas (elas só enxergam tarefas que o usuário enxerga).
drop policy if exists tarefas_team on public.tarefas;
create policy tarefas_team on public.tarefas for all
  using (
    public.is_team()
    and (not pessoal or criado_por = auth.uid())
    and (not gestao or public.is_admin())
  )
  with check (
    public.is_team()
    and (not pessoal or criado_por = auth.uid())
    and (not gestao or public.is_admin())
  );
