-- 1) Novo campo "fornecedor" nos lançamentos de gasto.
alter table public.lancamentos add column if not exists fornecedor text;

-- 2) Nova categoria de gasto: Material Pintura.
insert into public.categorias (nome)
select 'Material Pintura'
where not exists (select 1 from public.categorias where nome = 'Material Pintura');
