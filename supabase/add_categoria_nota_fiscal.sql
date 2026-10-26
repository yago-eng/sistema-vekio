-- Nova categoria de arquivo "nota_fiscal": fotos de notas/cupons anexadas ao
-- lançar um gasto passam a ficar num grupo próprio, separado das fotos da obra.
-- 1) libera a categoria na restrição da coluna;
-- 2) reclassifica as notas já enviadas: arquivos "documento" enviados pela mesma
--    pessoa, na mesma obra, até 2 minutos antes/depois de um gasto lançado.
-- Rode este script inteiro no SQL Editor do Supabase.

alter table public.arquivos drop constraint if exists arquivos_categoria_check;
alter table public.arquivos add constraint arquivos_categoria_check
  check (categoria in ('projeto', 'contrato', 'foto', 'relatorio', 'registro', 'documento', 'nota_fiscal'));

update public.arquivos a
set categoria = 'nota_fiscal'
where a.categoria = 'documento'
  and exists (
    select 1 from public.lancamentos l
    where l.obra_id = a.obra_id
      and l.lancado_por = a.enviado_por
      and abs(extract(epoch from (l.created_at - a.created_at))) < 120
  );
