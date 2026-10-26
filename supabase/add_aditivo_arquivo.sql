-- Orçamento (arquivo) relacionado a cada aditivo da obra. Se o arquivo for
-- excluído, o aditivo continua existindo, só perde o vínculo.
alter table public.obra_aditivos
  add column if not exists arquivo_id uuid references public.arquivos(id) on delete set null;
