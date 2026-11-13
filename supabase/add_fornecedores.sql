-- Cadastro de fornecedores: qualquer pessoa da equipe pode cadastrar um novo
-- direto no campo "Fornecedor" (lançar gasto, lançamentos da obra, lembretes).
-- A lista fixa que já existia no sistema entra como ponto de partida.
create table if not exists public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists fornecedores_nome_unico on public.fornecedores (lower(nome));

alter table public.fornecedores enable row level security;

drop policy if exists fornecedores_select on public.fornecedores;
create policy fornecedores_select on public.fornecedores for select
  using (public.is_team());
drop policy if exists fornecedores_insert on public.fornecedores;
create policy fornecedores_insert on public.fornecedores for insert
  with check (public.is_team());

insert into public.fornecedores (nome) values
  ('Casas d''Água'), ('Ms Entulhos'), ('Completa'), ('Stecanela'), ('Construcolor'),
  ('Joacir Empreiteiro'), ('Vitor Rubi Gesseiro'), ('Philipe Eletricista'), ('JotaJota'),
  ('Reni Impermeabilizantes'), ('B. Brasil'), ('Proffato'), ('Jorge Entulho'),
  ('Freddy Instaladora'), ('Cassol'), ('Raul Ary Koch Ltda'), ('Rossi'), ('HIDROWOLT'),
  ('Instaladora Palestina'), ('Digital SAT'), ('Corema'), ('Juliano Dressler Empreiteiro'),
  ('Alexandre Empreiteiro'), ('Djair Encanador'), ('Juarez Encanador'), ('João Pintor'),
  ('Jean Gesseiro'), ('João Antonio Gesseiro'), ('Elton Ilumitech Eletricista'),
  ('Alan Caçamba Entulho'), ('Baron Revestimentos')
on conflict do nothing;
