-- Nova categoria de arquivo "cronograma": cronograma feito fora do sistema
-- (PDF, imagem ou planilha) enviado em Documentos. Ele aparece na aba
-- Cronograma da obra e na Área do Cliente.
-- Rode este script inteiro no SQL Editor do Supabase.

alter table public.arquivos drop constraint if exists arquivos_categoria_check;
alter table public.arquivos add constraint arquivos_categoria_check
  check (categoria in ('projeto', 'contrato', 'cronograma', 'foto', 'relatorio', 'registro', 'documento', 'nota_fiscal'));
