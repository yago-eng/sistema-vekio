-- Reação de "joinha" (👍) nos comentários das tarefas.
-- Cada pessoa pode reagir uma vez por comentário; clicar de novo remove a reação.
create table if not exists public.tarefa_comentario_reacoes (
  comentario_id uuid not null references public.tarefa_comentarios(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comentario_id, user_id)
);

alter table public.tarefa_comentario_reacoes enable row level security;

-- A equipe vê as reações; cada pessoa só cria e remove a própria.
drop policy if exists tarefa_reacoes_select on public.tarefa_comentario_reacoes;
create policy tarefa_reacoes_select on public.tarefa_comentario_reacoes for select
  using (public.is_team());
drop policy if exists tarefa_reacoes_insert on public.tarefa_comentario_reacoes;
create policy tarefa_reacoes_insert on public.tarefa_comentario_reacoes for insert
  with check (public.is_team() and user_id = auth.uid());
drop policy if exists tarefa_reacoes_delete on public.tarefa_comentario_reacoes;
create policy tarefa_reacoes_delete on public.tarefa_comentario_reacoes for delete
  using (user_id = auth.uid());
