-- Tarefas, parte 2: tarefas pessoais (só o dono vê) e obras favoritas por usuário.
-- Rode este script inteiro no SQL Editor do Supabase (depois do add_tarefas.sql).

-- ---------------------------------------------------------------------------
-- Tarefas pessoais: pessoal = true => só quem criou enxerga (nem admin).
-- ---------------------------------------------------------------------------
alter table public.tarefas
  add column if not exists pessoal boolean not null default false;

create index if not exists tarefas_pessoal_idx on public.tarefas (criado_por) where pessoal;

drop policy if exists tarefas_team on public.tarefas;
create policy tarefas_team on public.tarefas for all
  using (public.is_team() and (not pessoal or criado_por = auth.uid()))
  with check (public.is_team() and (not pessoal or criado_por = auth.uid()));

-- Checklist, anexos e comentários herdam a visibilidade da tarefa: o "exists"
-- abaixo já passa pela política acima, então só enxerga quem enxerga a tarefa.
drop policy if exists tarefa_checklist_team on public.tarefa_checklist;
create policy tarefa_checklist_team on public.tarefa_checklist for all
  using (public.is_team() and exists (select 1 from public.tarefas t where t.id = tarefa_id))
  with check (public.is_team() and exists (select 1 from public.tarefas t where t.id = tarefa_id));

drop policy if exists tarefa_anexos_team on public.tarefa_anexos;
create policy tarefa_anexos_team on public.tarefa_anexos for all
  using (public.is_team() and exists (select 1 from public.tarefas t where t.id = tarefa_id))
  with check (public.is_team() and exists (select 1 from public.tarefas t where t.id = tarefa_id));

drop policy if exists tarefa_comentarios_select on public.tarefa_comentarios;
create policy tarefa_comentarios_select on public.tarefa_comentarios for select
  using (public.is_team() and exists (select 1 from public.tarefas t where t.id = tarefa_id));
drop policy if exists tarefa_comentarios_insert on public.tarefa_comentarios;
create policy tarefa_comentarios_insert on public.tarefa_comentarios for insert
  with check (
    public.is_team() and autor_id = auth.uid()
    and exists (select 1 from public.tarefas t where t.id = tarefa_id)
  );

-- ---------------------------------------------------------------------------
-- Obras favoritas: cada usuário monta a própria lista de acesso rápido.
-- ---------------------------------------------------------------------------
create table if not exists public.obra_favoritas (
  user_id uuid not null references public.profiles(id) on delete cascade,
  obra_id uuid not null references public.obras(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, obra_id)
);

alter table public.obra_favoritas enable row level security;

drop policy if exists obra_favoritas_own on public.obra_favoritas;
create policy obra_favoritas_own on public.obra_favoritas for all
  using (public.is_team() and user_id = auth.uid())
  with check (public.is_team() and user_id = auth.uid());
