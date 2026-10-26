-- Área do Cliente: vínculo cliente↔obra e acesso somente-leitura
-- Rode este script inteiro no SQL Editor do Supabase.

create table if not exists public.cliente_obras (
  cliente_id uuid not null references public.profiles(id) on delete cascade,
  obra_id uuid not null references public.obras(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (cliente_id, obra_id)
);

alter table public.cliente_obras enable row level security;

create or replace function public.is_cliente_da_obra(obra uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.cliente_obras
    where cliente_id = auth.uid() and obra_id = obra
  );
$$;

-- cliente_obras: cliente vê seus próprios vínculos; admin gerencia tudo
drop policy if exists "cliente_obras_select" on public.cliente_obras;
create policy "cliente_obras_select" on public.cliente_obras for select
  using (cliente_id = auth.uid() or public.is_admin());

drop policy if exists "cliente_obras_write_admin" on public.cliente_obras;
create policy "cliente_obras_write_admin" on public.cliente_obras for all
  using (public.is_admin()) with check (public.is_admin());

-- obras / etapas / arquivos: cliente lê somente o que está vinculado a ele
-- (políticas adicionais — se somam via OR às políticas "..._all" já existentes,
-- que continuam restritas à equipe)
drop policy if exists "obras_select_cliente" on public.obras;
create policy "obras_select_cliente" on public.obras for select
  using (public.is_cliente_da_obra(id));

drop policy if exists "etapas_select_cliente" on public.etapas;
create policy "etapas_select_cliente" on public.etapas for select
  using (public.is_cliente_da_obra(obra_id));

drop policy if exists "arquivos_select_cliente" on public.arquivos;
create policy "arquivos_select_cliente" on public.arquivos for select
  using (public.is_cliente_da_obra(obra_id));

-- Storage: cliente consegue baixar/visualizar arquivos das obras vinculadas
drop policy if exists "arquivos_storage_select_cliente" on storage.objects;
create policy "arquivos_storage_select_cliente" on storage.objects for select
  using (
    bucket_id = 'arquivos'
    and exists (
      select 1 from public.arquivos a
      where a.caminho_armazenado = storage.objects.name
        and public.is_cliente_da_obra(a.obra_id)
    )
  );

-- profiles: admin precisa poder promover um perfil recém-criado a "cliente"
-- e definir o nome informado no convite (o trigger de proteção contra
-- auto-escalação de `role`, em fix_role_escalation.sql, já garante que só
-- um admin de fato consegue alterar o campo role de qualquer linha).
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles for update
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- Passo manual no painel do Supabase (obrigatório para o link mágico
-- funcionar): Authentication → URL Configuration → Redirect URLs
-- adicionar:
--   https://sistema-vekio.vercel.app/auth/callback
-- ============================================================
