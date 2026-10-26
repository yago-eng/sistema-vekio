-- CORREÇÃO DEFINITIVA: "Convite enviado, mas não foi possível localizar o
-- novo perfil."
--
-- Causa raiz: o código de convite dependia do gatilho on_auth_user_created
-- pra criar a linha em `profiles` — mas esse gatilho só dispara quando um
-- usuário de autenticação é criado PELA PRIMEIRA VEZ. Se o e-mail já tinha
-- uma conta de autenticação no Supabase por qualquer motivo (conta de teste
-- antiga, conta criada direto no painel, etc.) mas sem uma linha
-- correspondente em `profiles`, o convite nunca conseguia localizar/criar
-- esse perfil — e ficava preso nesse erro pra sempre, com qualquer e-mail
-- nessa situação (foi o que aconteceu com a Gabriela e agora também com um
-- e-mail pessoal seu, usado pra confirmar o bug).
--
-- Esta função resolve os dois casos (usuário novo OU usuário de auth
-- pré-existente sem perfil) de uma vez, buscando direto na tabela interna
-- auth.users (que o código do app não consegue acessar via API normal) e
-- garantindo que o perfil exista com role="cliente".
--
-- Rode este script inteiro no SQL Editor do Supabase.

create or replace function public.ensure_cliente_profile(target_email text, target_nome text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  if not public.is_team() then
    raise exception 'not authorized';
  end if;

  select id into uid from auth.users where email = target_email;
  if uid is null then
    return null;
  end if;

  insert into public.profiles (id, nome, email, role)
  values (uid, target_nome, target_email, 'cliente')
  on conflict (id) do update set role = 'cliente', nome = excluded.nome, email = excluded.email;

  return uid;
end;
$$;

grant execute on function public.ensure_cliente_profile(text, text) to authenticated;
