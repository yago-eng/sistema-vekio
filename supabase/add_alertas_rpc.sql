-- Funções para o job diário de alertas (rodam com SECURITY DEFINER, gated por segredo)
-- O segredo abaixo deve ser igual ao CRON_SECRET configurado na Vercel.

create or replace function public.alertas_pendentes(p_secret text)
returns setof public.datas_importantes
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_secret is null or p_secret <> '2dce435f09e7635d86fdbc682bbce2d131f608a08c8e19e1' then
    raise exception 'não autorizado';
  end if;
  return query
    select * from public.datas_importantes
    where alerta_enviado = false
      and data - alerta_dias_antes <= current_date
      and data >= current_date;
end;
$$;

create or replace function public.marcar_alerta_enviado(p_secret text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_secret is null or p_secret <> '2dce435f09e7635d86fdbc682bbce2d131f608a08c8e19e1' then
    raise exception 'não autorizado';
  end if;
  update public.datas_importantes set alerta_enviado = true where id = p_id;
end;
$$;
