-- Lista de aditivos por obra (cada linha é um aditivo lançado, somados automaticamente)
create table if not exists public.obra_aditivos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete cascade,
  descricao text not null,
  valor numeric not null default 0,
  data date not null default current_date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.obra_aditivos enable row level security;

drop policy if exists obra_aditivos_all on public.obra_aditivos;
create policy obra_aditivos_all on public.obra_aditivos
  for all using (public.is_team()) with check (public.is_team());

-- Preserva os valores de aditivos já lançados em cada obra como um item
-- inicial na lista, para não perder o que já foi informado até agora.
insert into public.obra_aditivos (obra_id, descricao, valor, data)
select id, 'Aditivos lançados anteriormente', valor_aditivos, data_inicio
from public.obras
where valor_aditivos > 0;
