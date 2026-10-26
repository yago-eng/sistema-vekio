-- Duas novas categorias de gasto: Material de Limpeza e Alimentação.
insert into public.categorias (nome, ordem)
select 'Material Limpeza', 5
where not exists (select 1 from public.categorias where nome = 'Material Limpeza');

insert into public.categorias (nome, ordem)
select 'Alimentação', 13
where not exists (select 1 from public.categorias where nome = 'Alimentação');

-- Reabre espaço na ordem: Mão de obra e o restante passam uma posição pra frente.
update public.categorias set ordem = 6 where nome = 'Mão de obra';
update public.categorias set ordem = 7 where nome = 'Comissão';
update public.categorias set ordem = 8 where nome = 'Equipamentos';
update public.categorias set ordem = 9 where nome = 'Estadia';
update public.categorias set ordem = 10 where nome = 'Fretes';
update public.categorias set ordem = 11 where nome = 'Passagem';
update public.categorias set ordem = 12 where nome = 'Documentações';
update public.categorias set ordem = 14 where nome = 'Plotagens';
