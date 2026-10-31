-- Tarefas (estilo ClickUp): lista de tarefas da empresa e de cada obra, com
-- responsável, prazo, prioridade, checklist, comentários, anexos e repetição.
-- Só a equipe (admin e equipe) enxerga e usa; cliente não tem acesso a nada daqui.
-- Também permite avisos direcionados a uma pessoa só (notificacoes.destinatario_id).
-- Rode este script inteiro no SQL Editor do Supabase.

create table if not exists public.tarefas (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid references public.obras(id) on delete cascade,
  titulo text not null,
  descricao text not null default '',
  status text not null default 'a_fazer' check (status in ('a_fazer', 'fazendo', 'concluida')),
  prioridade text not null default 'normal' check (prioridade in ('urgente', 'alta', 'normal', 'baixa')),
  responsavel_id uuid references public.profiles(id) on delete set null,
  prazo date,
  recorrencia text not null default 'nenhuma' check (recorrencia in ('nenhuma', 'diaria', 'semanal', 'quinzenal', 'mensal')),
  criado_por uuid references public.profiles(id) on delete set null,
  concluida_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tarefas_obra_idx on public.tarefas (obra_id);
create index if not exists tarefas_responsavel_idx on public.tarefas (responsavel_id);
create index if not exists tarefas_status_prazo_idx on public.tarefas (status, prazo);

create table if not exists public.tarefa_checklist (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid not null references public.tarefas(id) on delete cascade,
  texto text not null,
  feito boolean not null default false,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists tarefa_checklist_tarefa_idx on public.tarefa_checklist (tarefa_id);

create table if not exists public.tarefa_comentarios (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid not null references public.tarefas(id) on delete cascade,
  autor_id uuid references public.profiles(id) on delete set null,
  texto text not null,
  created_at timestamptz not null default now()
);
create index if not exists tarefa_comentarios_tarefa_idx on public.tarefa_comentarios (tarefa_id);

create table if not exists public.tarefa_anexos (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid not null references public.tarefas(id) on delete cascade,
  nome_original text not null,
  caminho_armazenado text not null,
  tamanho_bytes bigint not null,
  mime_type text not null,
  enviado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists tarefa_anexos_tarefa_idx on public.tarefa_anexos (tarefa_id);

alter table public.tarefas enable row level security;
alter table public.tarefa_checklist enable row level security;
alter table public.tarefa_comentarios enable row level security;
alter table public.tarefa_anexos enable row level security;

drop policy if exists tarefas_team on public.tarefas;
create policy tarefas_team on public.tarefas for all
  using (public.is_team()) with check (public.is_team());

drop policy if exists tarefa_checklist_team on public.tarefa_checklist;
create policy tarefa_checklist_team on public.tarefa_checklist for all
  using (public.is_team()) with check (public.is_team());

drop policy if exists tarefa_anexos_team on public.tarefa_anexos;
create policy tarefa_anexos_team on public.tarefa_anexos for all
  using (public.is_team()) with check (public.is_team());

-- Comentários: a equipe lê e escreve; só o autor (ou admin) apaga.
drop policy if exists tarefa_comentarios_select on public.tarefa_comentarios;
create policy tarefa_comentarios_select on public.tarefa_comentarios for select using (public.is_team());
drop policy if exists tarefa_comentarios_insert on public.tarefa_comentarios;
create policy tarefa_comentarios_insert on public.tarefa_comentarios for insert
  with check (public.is_team() and autor_id = auth.uid());
drop policy if exists tarefa_comentarios_delete on public.tarefa_comentarios;
create policy tarefa_comentarios_delete on public.tarefa_comentarios for delete
  using (autor_id = auth.uid() or public.is_admin());

-- Avisos direcionados: quando preenchido, só aquela pessoa vê a notificação
-- (ex.: "Fulano atribuiu uma tarefa a você").
alter table public.notificacoes
  add column if not exists destinatario_id uuid references public.profiles(id) on delete cascade;
