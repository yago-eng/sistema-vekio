-- Datas importantes (admin), com alerta por e-mail
create table if not exists public.datas_importantes (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text not null default '',
  data date not null,
  alerta_dias_antes integer not null default 3,
  alerta_enviado boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.datas_importantes enable row level security;

-- Somente admin lê/escreve.
drop policy if exists datas_importantes_admin on public.datas_importantes;
create policy datas_importantes_admin on public.datas_importantes
  for all using (public.is_admin()) with check (public.is_admin());
