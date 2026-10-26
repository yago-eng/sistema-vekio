-- CORREÇÃO: convite de cliente feito por um membro da equipe (não admin)
-- some da tela / não é criado corretamente.
--
-- Causa: a tabela cliente_obras (vínculo cliente<->obra, usado pra listar
-- "Clientes desta obra" e controlar quais abas cada um vê) só permitia
-- leitura/escrita por ADMIN (política "cliente_obras_write_admin", for all,
-- using is_admin()). O código já permite que qualquer membro da equipe
-- convide e gerencie clientes (requireTeam()), mas o banco continuava
-- bloqueando: o INSERT do vínculo falhava silenciosamente e/ou a lista de
-- clientes da obra vinha vazia pra quem não é admin.
--
-- Rode este script inteiro no SQL Editor do Supabase.

drop policy if exists "cliente_obras_select" on public.cliente_obras;
create policy "cliente_obras_select" on public.cliente_obras for select
  using (cliente_id = auth.uid() or public.is_team());

drop policy if exists "cliente_obras_write_admin" on public.cliente_obras;
drop policy if exists "cliente_obras_write_team" on public.cliente_obras;
create policy "cliente_obras_write_team" on public.cliente_obras for all
  using (public.is_team())
  with check (public.is_team());
