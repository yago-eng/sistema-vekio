-- Legenda opcional pros arquivos (usada principalmente em fotos mostradas ao cliente).
alter table public.arquivos add column if not exists legenda text;
