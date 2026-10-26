-- 1) Formatação (negrito e cor) da descrição dos itens do orçamento.
alter table public.orcamento_itens add column if not exists negrito boolean not null default false;
alter table public.orcamento_itens add column if not exists cor text;

-- 2) Acessos às obras por pessoa (pra mostrar "Obras recentes" na página inicial).
create table if not exists public.obra_acessos (
  user_id uuid not null references public.profiles(id) on delete cascade,
  obra_id uuid not null references public.obras(id) on delete cascade,
  dia date not null default current_date,
  vezes int not null default 1,
  primary key (user_id, obra_id, dia)
);
alter table public.obra_acessos enable row level security;
drop policy if exists obra_acessos_own on public.obra_acessos;
create policy obra_acessos_own on public.obra_acessos for all
  using (user_id = auth.uid() and public.is_team())
  with check (user_id = auth.uid() and public.is_team());

-- 3) Notificações push no celular: cada aparelho que ativar fica registrado aqui.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
-- A equipe precisa ler os aparelhos dos colegas pra poder avisá-los.
drop policy if exists push_subscriptions_select on public.push_subscriptions;
create policy push_subscriptions_select on public.push_subscriptions for select using (public.is_team());
drop policy if exists push_subscriptions_insert on public.push_subscriptions;
create policy push_subscriptions_insert on public.push_subscriptions for insert
  with check (user_id = auth.uid() and public.is_team());
drop policy if exists push_subscriptions_delete on public.push_subscriptions;
create policy push_subscriptions_delete on public.push_subscriptions for delete
  using (user_id = auth.uid() or public.is_team());
drop policy if exists push_subscriptions_update on public.push_subscriptions;
create policy push_subscriptions_update on public.push_subscriptions for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 4) Funções usadas pela rotina diária (rodam sem usuário logado, protegidas
--    pelo mesmo segredo das funções de alerta que já existem).
create or replace function public.push_assinaturas_admin(p_secret text)
returns setof public.push_subscriptions
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_secret is null or p_secret <> '2dce435f09e7635d86fdbc682bbce2d131f608a08c8e19e1' then
    raise exception 'não autorizado';
  end if;
  return query
    select ps.* from public.push_subscriptions ps
    join public.profiles p on p.id = ps.user_id
    where p.role = 'admin';
end;
$$;

create or replace function public.alertas_financeiros_hoje(p_secret text)
returns table (tipo text, titulo text, descricao text, valor numeric, link text)
language plpgsql
security definer
set search_path = public
as $$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if p_secret is null or p_secret <> '2dce435f09e7635d86fdbc682bbce2d131f608a08c8e19e1' then
    raise exception 'não autorizado';
  end if;
  return query
    select 'parcela_vence'::text,
           ('Hoje vence a parcela do cliente ' || o.nome)::text,
           pg.descricao::text,
           pg.valor::numeric,
           ('/obras/' || o.id)::text
    from public.pagamentos pg
    join public.obras o on o.id = pg.obra_id
    where pg.data_prevista = hoje and pg.recebido = false
    union all
    select 'conta_pagar'::text,
           ('Hoje é dia de pagar: ' || cf.nome)::text,
           (cf.regiao)::text,
           cf.valor::numeric,
           '/financeiro'::text
    from public.custos_fixos cf
    where cf.data_vencimento = hoje and cf.status = 'pendente';
end;
$$;
