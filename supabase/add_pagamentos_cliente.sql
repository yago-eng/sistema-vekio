-- Área do Cliente: permite ao cliente ver (somente leitura) o fluxo de
-- pagamentos da própria obra, para a aba "Financeiro" do portal.
-- Rode este script inteiro no SQL Editor do Supabase.

drop policy if exists "pagamentos_select_cliente" on public.pagamentos;
create policy "pagamentos_select_cliente" on public.pagamentos for select
  using (public.is_cliente_da_obra(obra_id));
