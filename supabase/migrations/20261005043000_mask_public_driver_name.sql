create or replace function public.lookup_public_driver(p_reference text)
returns table(
  driver_reference text,
  full_name text,
  driver_type text,
  driver_status text,
  municipality_name text,
  municipality_code text,
  primary_vehicle_number text,
  primary_vehicle_type text
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    d.reference,
    (
      select string_agg(
        case
          when part.ordinality = 1 then part.word
          else left(part.word, 1) || '.'
        end,
        ' '
        order by part.ordinality
      )
      from unnest(regexp_split_to_array(trim(d.full_name), E'\\s+'))
        with ordinality as part(word, ordinality)
    ) as full_name,
    d.driver_type,
    d.status,
    m.name,
    m.code,
    v.mobigest_number,
    v.vehicle_type
  from public.drivers d
  join public.municipalities m
    on m.id = d.municipality_id
  left join lateral (
    select dv.vehicle_id
    from public.driver_vehicles dv
    where dv.driver_id = d.id
      and dv.status = 'activo'
    order by dv.is_primary desc, dv.starts_at desc, dv.created_at desc
    limit 1
  ) active_link on true
  left join public.vehicles v
    on v.id = active_link.vehicle_id
  where upper(d.reference) = upper(trim(p_reference))
    and m.status <> 'inactivo'
  limit 1;
$function$;
