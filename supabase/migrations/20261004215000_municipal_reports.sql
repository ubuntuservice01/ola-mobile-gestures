-- MobiGest — relatório operacional municipal agregado

create or replace function public.municipal_operational_report(
  p_from date default null,
  p_to date default null
)
returns table (
  municipality_id uuid,
  municipality_name text,
  municipality_code text,
  vehicles_total bigint,
  motorcycles_total bigint,
  cars_total bigint,
  bicycles_total bigint,
  active_vehicles bigint,
  suspended_vehicles bigint,
  stolen_vehicles bigint,
  seized_vehicles bigint,
  owners_total bigint,
  registrations_period bigint,
  transfers_period bigint,
  fiscalizations_period bigint,
  irregular_fiscalizations_period bigint,
  fines_period bigint,
  revenue_period numeric,
  pending_amount numeric,
  payments_period bigint,
  refunds_period bigint,
  exemptions_period bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_municipality uuid := (select private.current_operational_municipality_id());
begin
  if v_municipality is null then
    raise exception 'Contexto municipal não disponível';
  end if;

  if not (select private.can_operate_in_municipality(
    v_municipality,
    'reports.view'
  )) then
    raise exception 'Sem permissão para consultar relatórios';
  end if;

  if p_from is not null and p_to is not null and p_to < p_from then
    raise exception 'Período inválido';
  end if;

  return query
  select
    m.id,
    m.name,
    m.code,
    (
      select count(*)
      from public.vehicles v
      where v.municipality_id = m.id
        and v.status <> 'cancelada'
    ),
    (
      select count(*)
      from public.vehicles v
      where v.municipality_id = m.id
        and v.status <> 'cancelada'
        and v.vehicle_type = 'motorizada'
    ),
    (
      select count(*)
      from public.vehicles v
      where v.municipality_id = m.id
        and v.status <> 'cancelada'
        and v.vehicle_type = 'carro'
    ),
    (
      select count(*)
      from public.vehicles v
      where v.municipality_id = m.id
        and v.status <> 'cancelada'
        and v.vehicle_type = 'bicicleta'
    ),
    (
      select count(*)
      from public.vehicles v
      where v.municipality_id = m.id
        and v.status = 'activa'
    ),
    (
      select count(*)
      from public.vehicles v
      where v.municipality_id = m.id
        and v.status = 'suspensa'
    ),
    (
      select count(*)
      from public.vehicles v
      where v.municipality_id = m.id
        and v.status = 'roubada'
    ),
    (
      select count(*)
      from public.vehicles v
      where v.municipality_id = m.id
        and v.status = 'apreendida'
    ),
    (
      select count(*)
      from public.owners o
      where o.municipality_id = m.id
        and o.status <> 'inactivo'
    ),
    (
      select count(*)
      from public.registrations r
      where r.municipality_id = m.id
        and (p_from is null or r.created_at >= p_from::timestamptz)
        and (p_to is null or r.created_at < (p_to + 1)::timestamptz)
    ),
    (
      select count(*)
      from public.registrations r
      where r.municipality_id = m.id
        and r.registration_type = 'transferencia'
        and (p_from is null or r.created_at >= p_from::timestamptz)
        and (p_to is null or r.created_at < (p_to + 1)::timestamptz)
    ),
    (
      select count(*)
      from public.fiscalizations f
      where f.municipality_id = m.id
        and (p_from is null or f.occurred_at >= p_from::timestamptz)
        and (p_to is null or f.occurred_at < (p_to + 1)::timestamptz)
    ),
    (
      select count(*)
      from public.fiscalizations f
      where f.municipality_id = m.id
        and f.result <> 'regular'
        and (p_from is null or f.occurred_at >= p_from::timestamptz)
        and (p_to is null or f.occurred_at < (p_to + 1)::timestamptz)
    ),
    (
      select count(*)
      from public.fines f
      where f.municipality_id = m.id
        and (p_from is null or f.occurred_at >= p_from::timestamptz)
        and (p_to is null or f.occurred_at < (p_to + 1)::timestamptz)
    ),
    coalesce((
      select sum(p.amount)
      from public.payments p
      join public.charges c on c.id = p.charge_id
      where c.municipality_id = m.id
        and p.paid_at is not null
        and (p_from is null or p.paid_at >= p_from::timestamptz)
        and (p_to is null or p.paid_at < (p_to + 1)::timestamptz)
    ), 0)::numeric,
    coalesce((
      select sum(c.amount)
      from public.charges c
      where c.municipality_id = m.id
        and c.status in ('pendente','em_confirmacao')
        and (p_from is null or c.created_at >= p_from::timestamptz)
        and (p_to is null or c.created_at < (p_to + 1)::timestamptz)
    ), 0)::numeric,
    (
      select count(*)
      from public.payments p
      join public.charges c on c.id = p.charge_id
      where c.municipality_id = m.id
        and p.paid_at is not null
        and (p_from is null or p.paid_at >= p_from::timestamptz)
        and (p_to is null or p.paid_at < (p_to + 1)::timestamptz)
    ),
    (
      select count(*)
      from public.payment_refunds pr
      where pr.municipality_id = m.id
        and (p_from is null or pr.refunded_at >= p_from::timestamptz)
        and (p_to is null or pr.refunded_at < (p_to + 1)::timestamptz)
    ),
    (
      select count(*)
      from public.charges c
      where c.municipality_id = m.id
        and c.status = 'isento'
        and (p_from is null or c.updated_at >= p_from::timestamptz)
        and (p_to is null or c.updated_at < (p_to + 1)::timestamptz)
    )
  from public.municipalities m
  where m.id = v_municipality;
end;
$$;

revoke all on function public.municipal_operational_report(date,date) from public;
grant execute on function public.municipal_operational_report(date,date) to authenticated;
