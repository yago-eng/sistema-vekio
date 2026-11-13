-- Só administradores podem remover fornecedores da lista.
-- (Lançamentos antigos continuam com o nome do fornecedor que já tinham.)
drop policy if exists fornecedores_delete on public.fornecedores;
create policy fornecedores_delete on public.fornecedores for delete
  using (public.is_admin());
