-- Custos fixos por sede (contas a pagar mensais da empresa, não ligadas a uma obra)
create table if not exists public.custos_fixos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  regiao text not null check (regiao in ('Balneário Camboriú', 'Florianópolis', 'São Paulo')),
  valor numeric not null default 0,
  data_vencimento date not null,
  status text not null default 'pendente' check (status in ('pendente', 'pago')),
  observacao text not null default '',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.custos_fixos enable row level security;

drop policy if exists custos_fixos_all on public.custos_fixos;
create policy custos_fixos_all on public.custos_fixos
  for all using (public.is_team()) with check (public.is_team());

-- Pipeline de orçamentos: uma obra pode nascer como proposta (pipeline_status
-- preenchido) antes de virar uma obra "de verdade". null = obra normal.
alter table public.obras
  add column if not exists pipeline_status text
  check (pipeline_status in ('em_andamento', 'efetivado', 'negado'));
