-- Controle de quais abas da Área do Cliente ficam disponíveis para cada
-- cliente, por obra vinculada. Por padrão, todas as abas ficam habilitadas
-- (comportamento igual ao atual) até o admin restringir.
-- Rode este script inteiro no SQL Editor do Supabase.

alter table public.cliente_obras
  add column if not exists abas_visiveis text[] not null
  default array['cronograma', 'financeiro', 'relatorios', 'fotos', 'documentos'];
