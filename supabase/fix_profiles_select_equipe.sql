-- CORREÇÃO: convite de cliente feito por conta "equipe" falha com
-- "Convite enviado, mas não foi possível localizar o novo perfil."
--
-- Causa: depois de criar o usuário (signInWithOtp), o código busca o perfil
-- recém-criado por e-mail pra vincular o role="cliente" e a obra. Mas a
-- política "profiles_select" só deixava um usuário ler O PRÓPRIO perfil, a
-- não ser que fosse admin — então uma conta "equipe" nunca conseguia
-- enxergar o perfil do cliente que acabou de criar (nem os perfis dos
-- clientes já existentes, o que também deixava a lista "Clientes com
-- acesso" vazia/quebrada pra quem não é admin).
--
-- Rode este script inteiro no SQL Editor do Supabase.

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select
  using (id = auth.uid() or public.is_team());
