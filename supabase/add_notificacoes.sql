-- Sistema de notificações (sino no topo do sistema).
-- 1) notificacoes: eventos registrados quando algo acontece (obra/cliente
--    criado, orçamento efetivado, gastos lançados). Os avisos por data
--    (parcela vencendo, conta a pagar, aniversário) NÃO ficam aqui — são
--    calculados na hora a partir dos dados que já existem.
-- 2) profiles.notificacoes_lidas_ate: até quando cada pessoa já leu; tudo
--    que for mais novo que isso conta como não lido.
-- Rode este script inteiro no SQL Editor do Supabase.

create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  titulo text not null,
  descricao text not null default '',
  obra_id uuid references public.obras(id) on delete cascade,
  obra_nome text,
  link text,
  ator_id uuid references public.profiles(id) on delete set null,
  ator_nome text not null default '',
  chave text unique,
  quantidade int not null default 1,
  created_at timestamptz not null default now(),
  atualizada_em timestamptz not null default now()
);

create index if not exists notificacoes_atualizada_em_idx on public.notificacoes (atualizada_em desc);

alter table public.notificacoes enable row level security;

drop policy if exists notificacoes_select on public.notificacoes;
create policy notificacoes_select on public.notificacoes for select using (public.is_team());
drop policy if exists notificacoes_insert on public.notificacoes;
create policy notificacoes_insert on public.notificacoes for insert with check (public.is_team());
drop policy if exists notificacoes_update on public.notificacoes;
create policy notificacoes_update on public.notificacoes for update
  using (public.is_team()) with check (public.is_team());

alter table public.profiles
  add column if not exists notificacoes_lidas_ate timestamptz not null default now();
