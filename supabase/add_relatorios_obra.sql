-- "Relatório de obra": atualizações semanais escritas pela equipe, sempre
-- visíveis para o cliente vinculado à obra (sem toggle — é o objetivo da
-- aba). Rode este script inteiro no SQL Editor do Supabase.

create table if not exists public.relatorios_obra (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete cascade,
  data date not null,
  texto text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.relatorios_obra enable row level security;

drop policy if exists relatorios_obra_all on public.relatorios_obra;
create policy relatorios_obra_all on public.relatorios_obra
  for all using (public.is_team()) with check (public.is_team());

drop policy if exists relatorios_obra_select_cliente on public.relatorios_obra;
create policy relatorios_obra_select_cliente on public.relatorios_obra for select
  using (public.is_cliente_da_obra(obra_id));

-- Limpeza defensiva: remove "financeiro" de qualquer abas_visiveis já salva,
-- já que essa aba não deve mais existir na Área do Cliente.
update public.cliente_obras
set abas_visiveis = array_remove(abas_visiveis, 'financeiro')
where 'financeiro' = any(abas_visiveis);

alter table public.cliente_obras
  alter column abas_visiveis set default array['cronograma', 'diario', 'relatorios', 'fotos', 'documentos'];
