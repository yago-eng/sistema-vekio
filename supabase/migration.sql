-- Sistema Vekio — schema inicial para Supabase
-- Rode este script inteiro no SQL Editor do painel Supabase (Project > SQL Editor > New query)

create extension if not exists "pgcrypto";

-- ============================================================
-- Tabelas
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  email text,
  role text not null default 'equipe' check (role in ('admin', 'equipe', 'cliente')),
  created_at timestamptz not null default now()
);

create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null
);

create table if not exists public.obras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  endereco text not null,
  cliente_nome text not null,
  regiao text not null check (regiao in ('Balneário Camboriú', 'Florianópolis', 'São Paulo')),
  valor_venda numeric not null default 0,
  status text not null default 'em_andamento' check (status in ('planejamento', 'em_andamento', 'concluida', 'pausada')),
  data_inicio date not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete cascade,
  categoria_id uuid references public.categorias(id),
  valor numeric not null,
  descricao text not null,
  data date not null,
  lancado_por uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.etapas (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete cascade,
  nome text not null,
  data_inicio date not null,
  data_fim date not null,
  progresso int not null default 0,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.arquivos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete cascade,
  categoria text not null check (categoria in ('foto', 'relatorio', 'registro', 'documento')),
  nome_original text not null,
  caminho_armazenado text not null,
  tamanho_bytes bigint not null,
  mime_type text not null,
  enviado_por uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete cascade,
  tipo text not null check (tipo in ('material', 'mao_de_obra')),
  etapa text not null,
  descricao text not null,
  valor_unitario numeric not null default 0,
  quantidade numeric not null default 0,
  unidade text not null default '',
  valor_total numeric not null default 0,
  observacao text not null default '',
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.orcamento_parametros (
  obra_id uuid primary key references public.obras(id) on delete cascade,
  margem_vekio numeric not null default 0,
  rt numeric not null default 0,
  imposto numeric not null default 0,
  lucratividade_esperada numeric not null default 0,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Seed: categorias padrão
-- ============================================================

insert into public.categorias (nome)
select nome from (values
  ('Hidráulica'), ('Elétrica'), ('Civil'), ('Equipamentos'),
  ('Fretes'), ('Comissão'), ('Mão de obra')
) as v(nome)
where not exists (select 1 from public.categorias);

-- ============================================================
-- Perfil automático no signup
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    'equipe'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Helpers de autorização
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_team()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'equipe'));
$$;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.categorias enable row level security;
alter table public.obras enable row level security;
alter table public.lancamentos enable row level security;
alter table public.etapas enable row level security;
alter table public.arquivos enable row level security;
alter table public.orcamento_itens enable row level security;
alter table public.orcamento_parametros enable row level security;

-- profiles: cada um vê o próprio perfil; admin vê todos
create policy "profiles_select" on public.profiles for select
  using (id = auth.uid() or public.is_admin());
create policy "profiles_update_self" on public.profiles for update
  using (id = auth.uid());

-- categorias: qualquer membro da equipe lê; só admin edita
create policy "categorias_select" on public.categorias for select using (public.is_team());
create policy "categorias_write" on public.categorias for all
  using (public.is_admin()) with check (public.is_admin());

-- obras / lancamentos / etapas / arquivos: equipe inteira lê e escreve
create policy "obras_all" on public.obras for all
  using (public.is_team()) with check (public.is_team());
create policy "lancamentos_all" on public.lancamentos for all
  using (public.is_team()) with check (public.is_team());
create policy "etapas_all" on public.etapas for all
  using (public.is_team()) with check (public.is_team());
create policy "arquivos_all" on public.arquivos for all
  using (public.is_team()) with check (public.is_team());

-- orçamento: só admin (dados sensíveis de precificação/margem)
create policy "orcamento_itens_admin" on public.orcamento_itens for all
  using (public.is_admin()) with check (public.is_admin());
create policy "orcamento_parametros_admin" on public.orcamento_parametros for all
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- Storage: bucket privado para documentos das obras
-- ============================================================

insert into storage.buckets (id, name, public)
values ('arquivos', 'arquivos', false)
on conflict (id) do nothing;

create policy "arquivos_storage_select" on storage.objects for select
  using (bucket_id = 'arquivos' and public.is_team());
create policy "arquivos_storage_insert" on storage.objects for insert
  with check (bucket_id = 'arquivos' and public.is_team());
create policy "arquivos_storage_delete" on storage.objects for delete
  using (bucket_id = 'arquivos' and public.is_team());

-- ============================================================
-- Depois de criar sua conta em Authentication → Users, rode isto
-- (troque o e-mail) para virar admin e enxergar o módulo Orçamento:
-- ============================================================
-- update public.profiles set role = 'admin' where email = 'seu-email@vekio.com.br';
