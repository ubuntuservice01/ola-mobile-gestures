create or replace function public.current_municipality_statistics()
returns table (
  municipality_id uuid,
  vehicles_total bigint,
  motorcycles_total bigint,
  cars_total bigint,
  bicycles_total bigint,
  owners_total bigint,
  drivers_total bigint,
  registrations_total bigint,
  fines_total bigint,
  revenue_total numeric,
  users_total bigint,
  posts_total bigint,
  localities_total bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_municipality uuid :=
    (select private.current_operational_municipality_id());
begin
  if v_municipality is null then
    raise exception 'Contexto municipal não disponível';
  end if;

  if not (
    select private.can_operate_in_municipality(
      v_municipality,
      'dashboard.view'
    )
  ) then
    raise exception 'Sem permissão para consultar estatísticas municipais';
  end if;

  return query
  select
    v_municipality,
    (select count(*) from public.vehicles v
      where v.municipality_id = v_municipality
        and v.status <> 'cancelada'),
    (select count(*) from public.vehicles v
      where v.municipality_id = v_municipality
        and v.status <> 'cancelada'
        and v.vehicle_type = 'motorizada'),
    (select count(*) from public.vehicles v
      where v.municipality_id = v_municipality
        and v.status <> 'cancelada'
        and v.vehicle_type = 'carro'),
    (select count(*) from public.vehicles v
      where v.municipality_id = v_municipality
        and v.status <> 'cancelada'
        and v.vehicle_type = 'bicicleta'),
    (select count(*) from public.owners o
      where o.municipality_id = v_municipality
        and o.status <> 'inactivo'),
    (select count(*) from public.drivers d
      where d.municipality_id = v_municipality
        and d.driver_type in ('taxista','mototaxista')
        and d.status <> 'inactivo'),
    (select count(*) from public.registrations r
      where r.municipality_id = v_municipality),
    (select count(*) from public.fines f
      where f.municipality_id = v_municipality
        and f.status <> 'anulada'),
    (
      coalesce((
        select sum(p.amount)
        from public.payments p
        join public.charges c on c.id = p.charge_id
        where c.municipality_id = v_municipality
          and p.paid_at is not null
      ), 0)
      -
      coalesce((
        select sum(pr.amount)
        from public.payment_refunds pr
        where pr.municipality_id = v_municipality
      ), 0)
    )::numeric,
    (select count(*) from public.profiles p
      where p.municipality_id = v_municipality
        and p.role <> 'super_admin'),
    (select count(*) from public.administrative_posts ap
      where ap.municipality_id = v_municipality),
    (select count(*) from public.localities l
      where l.municipality_id = v_municipality);
end;
$$;

revoke all
on function public.current_municipality_statistics()
from public;

grant execute
on function public.current_municipality_statistics()
to authenticated;
