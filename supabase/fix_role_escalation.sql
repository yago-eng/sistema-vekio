-- Correção de segurança: impede que um usuário não-admin altere o próprio
-- campo `role` (ex: se autopromover a admin via chamada direta à API,
-- contornando a interface do sistema) — mas sem bloquear alterações feitas
-- pelo SQL Editor do Supabase (que roda sem um usuário autenticado no
-- contexto, então auth.uid() é nulo ali).

create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();
