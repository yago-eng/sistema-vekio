-- Formalização de orçamento: escopo de serviços gerado por IA
-- Rode este script inteiro no SQL Editor do Supabase.

create table if not exists public.orcamento_escopos (
  obra_id uuid primary key references public.obras(id) on delete cascade,
  conteudo jsonb not null,
  gerado_por uuid references public.profiles(id),
  gerado_em timestamptz not null default now()
);

alter table public.orcamento_escopos enable row level security;

drop policy if exists "orcamento_escopos_admin" on public.orcamento_escopos;
create policy "orcamento_escopos_admin" on public.orcamento_escopos for all
  using (public.is_admin()) with check (public.is_admin());
