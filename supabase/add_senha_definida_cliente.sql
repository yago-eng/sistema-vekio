-- Controla se o cliente já definiu uma senha própria (pra não ficar
-- oferecendo isso de novo depois que ele já configurou).
alter table public.profiles add column if not exists senha_definida boolean not null default false;
