-- Fluxo de caixa: parcelas/pagamentos previstos em contrato por obra.
create table if not exists public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete cascade,
  descricao text not null default '',
  valor numeric not null default 0,
  data_prevista date not null,
  recebido boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.pagamentos enable row level security;

drop policy if exists pagamentos_all on public.pagamentos;
create policy pagamentos_all on public.pagamentos
  for all using (public.is_team()) with check (public.is_team());
