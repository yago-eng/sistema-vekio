-- Controle de quais arquivos ficam visíveis na Área do Cliente.
-- Por padrão nenhum arquivo é visível (precisa ser marcado explicitamente).
-- Rode este script inteiro no SQL Editor do Supabase.

alter table public.arquivos add column if not exists visivel_cliente boolean not null default false;

drop policy if exists "arquivos_select_cliente" on public.arquivos;
create policy "arquivos_select_cliente" on public.arquivos for select
  using (visivel_cliente = true and public.is_cliente_da_obra(obra_id));

drop policy if exists "arquivos_storage_select_cliente" on storage.objects;
create policy "arquivos_storage_select_cliente" on storage.objects for select
  using (
    bucket_id = 'arquivos'
    and exists (
      select 1 from public.arquivos a
      where a.caminho_armazenado = storage.objects.name
        and a.visivel_cliente = true
        and public.is_cliente_da_obra(a.obra_id)
    )
  );
