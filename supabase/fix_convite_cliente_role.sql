-- CORREÇÃO DE SEGURANÇA URGENTE
--
-- Bug: quando um membro da EQUIPE (não admin) convida um cliente, o sistema
-- tenta setar o role do perfil dele para "cliente" — mas duas proteções do
-- banco, criadas para impedir auto-promoção, bloqueavam essa alteração:
--
-- 1. A política "profiles_update_admin" só deixa updates na tabela profiles
--    serem feitos por admin (ou pelo próprio dono da linha). A equipe não é
--    dona da linha do cliente, e não é admin — então o UPDATE era
--    silenciosamente ignorado pelo RLS (0 linhas afetadas, sem erro).
-- 2. Mesmo se passasse pela política, o trigger
--    "profiles_prevent_role_escalation" reverte qualquer troca de role feita
--    por quem não é admin — incluindo trocas em OUTRAS linhas, quando a
--    intenção original era só impedir alguém de promover A SI MESMO.
--
-- Resultado: um cliente convidado por alguém da equipe (não admin) ficava
-- com o role padrão do trigger de signup (equipe) para sempre — acesso
-- total ao painel interno, incluindo o financeiro de todas as obras.
--
-- Rode este script inteiro no SQL Editor do Supabase.

-- 1) Restringe o trigger anti-escalação para agir só quando alguém tenta
--    mudar O PRÓPRIO role (comportamento que o comentário original já dizia
--    ser a intenção, mas o código não checava isso).
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and auth.uid() = old.id
     and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

-- 2) Nova política: qualquer membro da equipe pode definir o role de OUTRO
--    perfil como "cliente" (necessário pro fluxo de convite) — mas nunca
--    como "admin" ou "equipe". Só um admin de fato continua podendo dar
--    qualquer role a qualquer perfil (política "profiles_update_admin",
--    já existente, continua valendo).
drop policy if exists "profiles_update_team_cliente" on public.profiles;
create policy "profiles_update_team_cliente" on public.profiles for update
  using (public.is_team())
  with check (role = 'cliente');

-- ============================================================
-- 3) AUDITORIA — rode esta consulta separadamente (selecione só o texto
-- abaixo e rode) pra ver se existe algum OUTRO cliente com o mesmo problema:
-- um perfil vinculado a uma obra (cliente_obras) mas com role diferente de
-- "cliente" — ou seja, alguém que deveria ter acesso só à área do cliente,
-- mas está com acesso de equipe/admin ao painel interno.
-- ============================================================

select
  p.id,
  p.nome,
  p.email,
  p.role as role_atual,
  co.obra_id,
  o.nome as obra_nome
from public.cliente_obras co
join public.profiles p on p.id = co.cliente_id
join public.obras o on o.id = co.obra_id
where p.role <> 'cliente';

-- Se a consulta acima retornar alguma linha, rode o UPDATE abaixo para
-- corrigir TODOS de uma vez (seguro: só afeta quem já está vinculado a uma
-- obra como cliente, nunca vai promover ninguém a admin/equipe):

-- update public.profiles
-- set role = 'cliente'
-- where id in (select cliente_id from public.cliente_obras)
--   and role <> 'cliente';
