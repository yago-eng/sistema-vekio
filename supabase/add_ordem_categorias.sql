-- Ordem de exibição das categorias de gasto (materiais primeiro, depois mão de
-- obra, depois o restante), correção de nome, e duas categorias novas.

alter table public.categorias add column if not exists ordem integer not null default 100;

update public.categorias set nome = 'Material Hidráulico' where nome = 'Material Hidráulica';

update public.categorias set ordem = 1 where nome = 'Material Civil';
update public.categorias set ordem = 2 where nome = 'Material Elétrico';
update public.categorias set ordem = 3 where nome = 'Material Hidráulico';
update public.categorias set ordem = 4 where nome = 'Material Pintura';
update public.categorias set ordem = 5 where nome = 'Mão de obra';
update public.categorias set ordem = 6 where nome = 'Comissão';
update public.categorias set ordem = 7 where nome = 'Equipamentos';
update public.categorias set ordem = 8 where nome = 'Estadia';
update public.categorias set ordem = 9 where nome = 'Fretes';
update public.categorias set ordem = 10 where nome = 'Passagem';

insert into public.categorias (nome, ordem)
select 'Documentações', 11
where not exists (select 1 from public.categorias where nome = 'Documentações');

insert into public.categorias (nome, ordem)
select 'Plotagens', 12
where not exists (select 1 from public.categorias where nome = 'Plotagens');
