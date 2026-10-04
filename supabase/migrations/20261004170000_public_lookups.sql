-- MobiGest — consultas públicas mínimas para QR e verificação de registos
-- Não expõe PII sensível, documentos, contactos, moradas ou identificadores técnicos.

create or replace function public.lookup_public_vehicle(
  p_code text
)
returns table (
  mobigest_number text,
  vehicle_type text,
  make text,
  model text,
  color text,
  manufacture_year integer,
  operational_status text,
  commercial_status text,
  municipality_name text,
  municipality_code text,
  registration_date date
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    v.mobigest_number,
    v.vehicle_type,
    v.make,
    v.model,
    v.color,
    v.manufacture_year,
    v.status,
    v.commercial_status,
    m.name,
    m.code,
    v.registration_date
  from public.vehicles v
  join public.municipalities m
    on m.id = v.municipality_id
  where
    v.mobigest_number is not null
    and upper(v.mobigest_number) = upper(trim(p_code))
    and m.status <> 'inactivo'
  limit 1;
$$;

create or replace function public.lookup_public_driver(
  p_reference text
)
returns table (
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
as $$
  select
    d.reference,
    d.full_name,
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
  where
    upper(d.reference) = upper(trim(p_reference))
    and m.status <> 'inactivo'
  limit 1;
$$;

revoke all on function public.lookup_public_vehicle(text) from public;
revoke all on function public.lookup_public_driver(text) from public;

grant execute on function public.lookup_public_vehicle(text) to anon, authenticated;
grant execute on function public.lookup_public_driver(text) to anon, authenticated;
