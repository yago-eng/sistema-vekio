-- Corrige o role da cliente Gabriela de volta para "cliente" — ela continua
-- com acesso normal à obra dela na área do cliente, mas perde o acesso de
-- equipe/financeiro que ganhou por engano.

update public.profiles
set role = 'cliente'
where email = 'gabrielademelloalves@outlook.com'
  and role <> 'cliente';

-- Confere o resultado:
select id, nome, email, role from public.profiles
where email = 'gabrielademelloalves@outlook.com';
