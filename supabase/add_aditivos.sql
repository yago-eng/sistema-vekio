-- Adiciona o campo de valor de aditivos em cada obra.
alter table public.obras
  add column if not exists valor_aditivos numeric not null default 0;
