-- Nova categoria de gasto: Entulho (remoção/caçamba de entulho).
insert into public.categorias (nome, ordem)
select 'Entulho', 15
where not exists (select 1 from public.categorias where nome = 'Entulho');
