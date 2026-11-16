-- Conexão das tarefas com o Google Agenda de cada pessoa.
-- google_agenda_conexoes: a autorização de cada pessoa (o token fica CRIPTOGRAFADO; a chave só existe na Vercel).
-- tarefa_google_eventos: qual evento da agenda corresponde a qual tarefa, para atualizar/apagar depois.

create table if not exists public.google_agenda_conexoes (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  refresh_token_cifrado text not null,
  calendar_id text not null,
  created_at timestamptz not null default now()
);

alter table public.google_agenda_conexoes enable row level security;

-- O sistema precisa ler a conexão de outra pessoa para colocar a tarefa atribuída a ela na agenda dela.
drop policy if exists google_conexoes_select on public.google_agenda_conexoes;
create policy google_conexoes_select on public.google_agenda_conexoes for select
  using (public.is_team());
drop policy if exists google_conexoes_insert on public.google_agenda_conexoes;
create policy google_conexoes_insert on public.google_agenda_conexoes for insert
  with check (public.is_team() and user_id = auth.uid());
drop policy if exists google_conexoes_update on public.google_agenda_conexoes;
create policy google_conexoes_update on public.google_agenda_conexoes for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists google_conexoes_delete on public.google_agenda_conexoes;
create policy google_conexoes_delete on public.google_agenda_conexoes for delete
  using (user_id = auth.uid());

create table if not exists public.tarefa_google_eventos (
  tarefa_id uuid not null references public.tarefas(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id text not null,
  primary key (tarefa_id, user_id)
);

alter table public.tarefa_google_eventos enable row level security;

drop policy if exists tarefa_google_eventos_all on public.tarefa_google_eventos;
create policy tarefa_google_eventos_all on public.tarefa_google_eventos for all
  using (public.is_team()) with check (public.is_team());
