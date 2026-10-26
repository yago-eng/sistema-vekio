-- Três novas categorias de gasto: Diversos, Climatização e Projetos.
insert into public.categorias (nome, ordem)
select 'Diversos', 16
where not exists (select 1 from public.categorias where nome = 'Diversos');

insert into public.categorias (nome, ordem)
select 'Climatização', 17
where not exists (select 1 from public.categorias where nome = 'Climatização');

insert into public.categorias (nome, ordem)
select 'Projetos', 18
where not exists (select 1 from public.categorias where nome = 'Projetos');
