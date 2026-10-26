-- Setor da mão de obra (Civil, Elétrica, Hidráulica, Pintura, Gesso...) nos
-- lançamentos de gasto — permite o relatório financeiro da obra mostrar
-- quanto foi gasto com cada setor, além do total de "Mão de obra".
alter table public.lancamentos add column if not exists setor text;
