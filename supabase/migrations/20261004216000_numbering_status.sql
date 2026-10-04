-- MobiGest — consulta segura do estado da numeração municipal

create or replace function public.current_mobigest_numbering_status()
returns table (
  municipality_id uuid,
  municipality_name text,
  municipality_code text,
  current_value bigint,
  next_value bigint,
  current_number text,
  next_number text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_municipality uuid := (select private.current_operational_municipality_id());
  v_role text := (select private.current_role());
begin
  if v_municipality is null then
    raise exception 'Contexto municipal não disponível';
  end if;

  if not (
    (select private.is_super_admin())
    or v_role = 'admin_municipal'
    or (select private.authorize('settings.view'))
  ) then
    raise exception 'Sem permissão para consultar a numeração';
  end if;

  return query
  select
    m.id,
    m.name,
    m.code,
    coalesce(n.current_value, 0)::bigint,
    (coalesce(n.current_value, 0) + 1)::bigint,
    case
      when coalesce(n.current_value, 0) = 0 then null
      else
        'MZ-' ||
        upper(m.code) ||
        '-' ||
        lpad(n.current_value::text, 6, '0')
    end,
    'MZ-' ||
    upper(m.code) ||
    '-' ||
    lpad((coalesce(n.current_value, 0) + 1)::text, 6, '0')
  from public.municipalities m
  left join public.numbering_counters n
    on n.municipality_id = m.id
  where m.id = v_municipality;
end;
$$;

revoke all on function public.current_mobigest_numbering_status() from public;
grant execute on function public.current_mobigest_numbering_status() to authenticated;
