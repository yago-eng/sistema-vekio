-- Marca cada notificação como lida individualmente (ao clicar nela).
-- Antes só existia o marcador "lidas até" (profiles.notificacoes_lidas_ate),
-- que serve para o "Marcar todas como lidas". Agora cada pessoa também guarda
-- quais notificações já abriu. Se a notificação for atualizada depois (ex:
-- mais um gasto lançado no mesmo dia), ela volta a aparecer como pendente.
-- Rode este script inteiro no SQL Editor do Supabase.

create table if not exists public.notificacoes_lidas (
  user_id uuid not null references public.profiles(id) on delete cascade,
  notificacao_id text not null,
  lida_em timestamptz not null default now(),
  primary key (user_id, notificacao_id)
);

alter table public.notificacoes_lidas enable row level security;

drop policy if exists notificacoes_lidas_select on public.notificacoes_lidas;
create policy notificacoes_lidas_select on public.notificacoes_lidas
  for select using (user_id = auth.uid());
drop policy if exists notificacoes_lidas_insert on public.notificacoes_lidas;
create policy notificacoes_lidas_insert on public.notificacoes_lidas
  for insert with check (user_id = auth.uid());
drop policy if exists notificacoes_lidas_update on public.notificacoes_lidas;
create policy notificacoes_lidas_update on public.notificacoes_lidas
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
