-- As categorias "projeto" e "contrato" foram adicionadas no app, mas a
-- restrição (CHECK) da coluna arquivos.categoria só aceitava as 4 categorias
-- originais — qualquer upload com essas novas categorias falhava.
-- Rode este script inteiro no SQL Editor do Supabase.

alter table public.arquivos drop constraint if exists arquivos_categoria_check;
alter table public.arquivos add constraint arquivos_categoria_check
  check (categoria in ('projeto', 'contrato', 'foto', 'relatorio', 'registro', 'documento'));
