-- Lembretes e notas privados de cada usuário
create table if not exists public.lembretes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  titulo text not null default '',
  conteudo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lembretes enable row level security;

-- Cada usuário só enxerga e edita os próprios lembretes.
drop policy if exists lembretes_select_own on public.lembretes;
create policy lembretes_select_own on public.lembretes
  for select using (user_id = auth.uid());

drop policy if exists lembretes_insert_own on public.lembretes;
create policy lembretes_insert_own on public.lembretes
  for insert with check (user_id = auth.uid());

drop policy if exists lembretes_update_own on public.lembretes;
create policy lembretes_update_own on public.lembretes
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists lembretes_delete_own on public.lembretes;
create policy lembretes_delete_own on public.lembretes
  for delete using (user_id = auth.uid());

-- Recorrência de custos fixos: se recorrente, dia_recorrencia guarda o dia do mês (1-31)
alter table public.custos_fixos
  add column if not exists recorrente boolean not null default false;
alter table public.custos_fixos
  add column if not exists dia_recorrencia integer;
