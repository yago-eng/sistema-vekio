-- Vincula cada pagamento ao documento de contrato anexado na obra (opcional)
alter table public.pagamentos
  add column if not exists arquivo_id uuid references public.arquivos(id) on delete set null;
