-- Permite ter mais de uma planilha de orçamento nomeada por obra/proposta.
-- Só ADICIONA estrutura nova e faz backfill dos dados existentes — nenhuma
-- linha é apagada. Rode este script inteiro no SQL Editor do Supabase.

-- 1. Tabela nova: uma "planilha" de orçamento por obra (pode haver várias).
create table if not exists public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete cascade,
  nome text not null default 'Orçamento 1',
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.orcamentos enable row level security;

drop policy if exists "orcamentos_admin" on public.orcamentos;
create policy "orcamentos_admin" on public.orcamentos for all
  using (public.is_admin()) with check (public.is_admin());

-- 2. Backfill: cria "Orçamento 1" para toda obra que já tem itens, parâmetros
-- ou escopo cadastrados, para não perder nada do que já existe.
insert into public.orcamentos (obra_id, nome, ordem)
select distinct obra_id, 'Orçamento 1', 0
from public.orcamento_itens
where obra_id not in (select obra_id from public.orcamentos);

insert into public.orcamentos (obra_id, nome, ordem)
select distinct obra_id, 'Orçamento 1', 0
from public.orcamento_parametros
where obra_id not in (select obra_id from public.orcamentos);

insert into public.orcamentos (obra_id, nome, ordem)
select distinct obra_id, 'Orçamento 1', 0
from public.orcamento_escopos
where obra_id not in (select obra_id from public.orcamentos);

-- 3. orcamento_itens: adiciona orcamento_id, faz backfill, e deixa de exigir
-- obra_id diretamente (a partir de agora obra_id é redundante/legado).
alter table public.orcamento_itens
  add column if not exists orcamento_id uuid references public.orcamentos(id) on delete cascade;

update public.orcamento_itens oi
set orcamento_id = o.id
from public.orcamentos o
where oi.obra_id = o.obra_id and oi.orcamento_id is null;

alter table public.orcamento_itens alter column orcamento_id set not null;
alter table public.orcamento_itens alter column obra_id drop not null;

-- 4. orcamento_parametros: adiciona orcamento_id, backfill, e troca a chave
-- primária de obra_id para orcamento_id (permite 1 linha de parâmetros por
-- planilha, em vez de 1 por obra).
alter table public.orcamento_parametros
  add column if not exists orcamento_id uuid references public.orcamentos(id) on delete cascade;

update public.orcamento_parametros op
set orcamento_id = o.id
from public.orcamentos o
where op.obra_id = o.obra_id and op.orcamento_id is null;

alter table public.orcamento_parametros drop constraint if exists orcamento_parametros_pkey;
alter table public.orcamento_parametros alter column orcamento_id set not null;
alter table public.orcamento_parametros add primary key (orcamento_id);
alter table public.orcamento_parametros alter column obra_id drop not null;

-- 5. orcamento_escopos: mesma coisa (1 escopo por planilha, não por obra).
alter table public.orcamento_escopos
  add column if not exists orcamento_id uuid references public.orcamentos(id) on delete cascade;

update public.orcamento_escopos oe
set orcamento_id = o.id
from public.orcamentos o
where oe.obra_id = o.obra_id and oe.orcamento_id is null;

alter table public.orcamento_escopos drop constraint if exists orcamento_escopos_pkey;
alter table public.orcamento_escopos alter column orcamento_id set not null;
alter table public.orcamento_escopos add primary key (orcamento_id);
alter table public.orcamento_escopos alter column obra_id drop not null;
