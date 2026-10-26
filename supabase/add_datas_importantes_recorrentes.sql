-- Datas importantes recorrentes (ex: aniversários) — repete todo ano no
-- mesmo dia/mês, e o alerta dispara de novo a cada ano.
-- Rode este script inteiro no SQL Editor do Supabase.

alter table public.datas_importantes add column if not exists recorrente boolean not null default false;
alter table public.datas_importantes add column if not exists ultimo_ano_alertado integer;

-- Constrói uma data válida mesmo quando o dia não existe naquele mês/ano
-- (ex: 29/fev em ano não bissexto vira 28/fev).
create or replace function public.data_segura(p_year int, p_month int, p_day int)
returns date
language sql
immutable
as $$
  select make_date(
    p_year, p_month,
    least(p_day, extract(day from (make_date(p_year, p_month, 1) + interval '1 month - 1 day'))::int)
  );
$$;

-- Para datas recorrentes, calcula a próxima ocorrência (mesmo dia/mês, no
-- ano atual ou no seguinte, o que estiver mais próximo à frente). Para
-- datas não recorrentes, apenas retorna a própria data.
create or replace function public.proxima_ocorrencia(p_data date, p_recorrente boolean)
returns date
language sql
stable
as $$
  select case
    when not p_recorrente then p_data
    when public.data_segura(extract(year from current_date)::int, extract(month from p_data)::int, extract(day from p_data)::int) < current_date
      then public.data_segura(extract(year from current_date)::int + 1, extract(month from p_data)::int, extract(day from p_data)::int)
    else public.data_segura(extract(year from current_date)::int, extract(month from p_data)::int, extract(day from p_data)::int)
  end;
$$;

drop function if exists public.alertas_pendentes(text);
create function public.alertas_pendentes(p_secret text)
returns table (
  id uuid,
  titulo text,
  descricao text,
  data_ocorrencia date,
  alerta_dias_antes integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_secret is null or p_secret <> '2dce435f09e7635d86fdbc682bbce2d131f608a08c8e19e1' then
    raise exception 'não autorizado';
  end if;
  return query
    select
      d.id, d.titulo, d.descricao,
      public.proxima_ocorrencia(d.data, d.recorrente) as data_ocorrencia,
      d.alerta_dias_antes
    from public.datas_importantes d
    where
      (
        d.recorrente = false
        and d.alerta_enviado = false
        and d.data - d.alerta_dias_antes <= current_date
        and d.data >= current_date
      )
      or
      (
        d.recorrente = true
        and public.proxima_ocorrencia(d.data, true) - d.alerta_dias_antes <= current_date
        and public.proxima_ocorrencia(d.data, true) >= current_date
        and (
          d.ultimo_ano_alertado is null
          or d.ultimo_ano_alertado <> extract(year from public.proxima_ocorrencia(d.data, true))
        )
      );
end;
$$;

create or replace function public.marcar_alerta_enviado(p_secret text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recorrente boolean;
  v_data date;
begin
  if p_secret is null or p_secret <> '2dce435f09e7635d86fdbc682bbce2d131f608a08c8e19e1' then
    raise exception 'não autorizado';
  end if;
  select recorrente, data into v_recorrente, v_data from public.datas_importantes where id = p_id;
  if v_recorrente then
    update public.datas_importantes
      set ultimo_ano_alertado = extract(year from public.proxima_ocorrencia(v_data, true))
      where id = p_id;
  else
    update public.datas_importantes set alerta_enviado = true where id = p_id;
  end if;
end;
$$;
