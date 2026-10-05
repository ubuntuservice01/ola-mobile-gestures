create or replace function public.current_municipality_dashboard_analytics()
returns table (
  registrations_monthly jsonb,
  revenue_monthly jsonb,
  fines_monthly jsonb,
  drivers_monthly jsonb,
  fiscalizations_monthly jsonb,
  fines_by_status jsonb,
  drivers_by_status jsonb,
  drivers_by_type jsonb,
  fiscalizations_total bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_municipality uuid := (select private.current_operational_municipality_id());
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
    raise exception 'Sem permissão para consultar analytics municipais';
  end if;

  return query
  with months as (
    select generate_series(
      date_trunc('month', now()) - interval '5 months',
      date_trunc('month', now()),
      interval '1 month'
    )::date as month_start
  ),
  registrations_by_month as (
    select m.month_start, count(r.id)::bigint as total
    from months m
    left join public.registrations r
      on r.municipality_id = v_municipality
     and r.created_at >= m.month_start
     and r.created_at < (m.month_start + interval '1 month')
    group by m.month_start
    order by m.month_start
  ),
  payments_by_month as (
    select m.month_start, coalesce(sum(p.amount), 0)::numeric as paid
    from months m
    left join public.charges c
      on c.municipality_id = v_municipality
    left join public.payments p
      on p.charge_id = c.id
     and p.paid_at is not null
     and p.paid_at >= m.month_start
     and p.paid_at < (m.month_start + interval '1 month')
    group by m.month_start
  ),
  refunds_by_month as (
    select m.month_start, coalesce(sum(pr.amount), 0)::numeric as refunded
    from months m
    left join public.payment_refunds pr
      on pr.municipality_id = v_municipality
     and pr.refunded_at >= m.month_start
     and pr.refunded_at < (m.month_start + interval '1 month')
    group by m.month_start
  ),
  revenue_by_month as (
    select p.month_start, greatest(p.paid - r.refunded, 0)::numeric as total
    from payments_by_month p
    join refunds_by_month r using (month_start)
    order by p.month_start
  ),
  fines_by_month as (
    select m.month_start, count(f.id)::bigint as total
    from months m
    left join public.fines f
      on f.municipality_id = v_municipality
     and f.status <> 'anulada'
     and f.created_at >= m.month_start
     and f.created_at < (m.month_start + interval '1 month')
    group by m.month_start
    order by m.month_start
  ),
  drivers_by_month as (
    select m.month_start, count(d.id)::bigint as total
    from months m
    left join public.drivers d
      on d.municipality_id = v_municipality
     and d.driver_type in ('taxista','mototaxista')
     and d.status <> 'inactivo'
     and d.created_at >= m.month_start
     and d.created_at < (m.month_start + interval '1 month')
    group by m.month_start
    order by m.month_start
  ),
  fiscalizations_by_month as (
    select m.month_start, count(fz.id)::bigint as total
    from months m
    left join public.fiscalizations fz
      on fz.municipality_id = v_municipality
     and fz.created_at >= m.month_start
     and fz.created_at < (m.month_start + interval '1 month')
    group by m.month_start
    order by m.month_start
  )
  select
    (
      select jsonb_agg(
        jsonb_build_object('month', month_start, 'total', total)
        order by month_start
      )
      from registrations_by_month
    ),
    (
      select jsonb_agg(
        jsonb_build_object('month', month_start, 'total', total)
        order by month_start
      )
      from revenue_by_month
    ),
    (
      select jsonb_agg(
        jsonb_build_object('month', month_start, 'total', total)
        order by month_start
      )
      from fines_by_month
    ),
    (
      select jsonb_agg(
        jsonb_build_object('month', month_start, 'total', total)
        order by month_start
      )
      from drivers_by_month
    ),
    (
      select jsonb_agg(
        jsonb_build_object('month', month_start, 'total', total)
        order by month_start
      )
      from fiscalizations_by_month
    ),
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object('status', status, 'total', total)
          order by status
        ),
        '[]'::jsonb
      )
      from (
        select f.status, count(*)::bigint as total
        from public.fines f
        where f.municipality_id = v_municipality
        group by f.status
      ) s
    ),
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object('status', status, 'total', total)
          order by status
        ),
        '[]'::jsonb
      )
      from (
        select d.status, count(*)::bigint as total
        from public.drivers d
        where d.municipality_id = v_municipality
          and d.driver_type in ('taxista','mototaxista')
        group by d.status
      ) s
    ),
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object('type', driver_type, 'total', total)
          order by driver_type
        ),
        '[]'::jsonb
      )
      from (
        select d.driver_type, count(*)::bigint as total
        from public.drivers d
        where d.municipality_id = v_municipality
          and d.driver_type in ('taxista','mototaxista')
        group by d.driver_type
      ) s
    ),
    (
      select count(*)::bigint
      from public.fiscalizations fz
      where fz.municipality_id = v_municipality
    );
end;
$function$;

revoke execute on function public.current_municipality_dashboard_analytics() from public, anon;
grant execute on function public.current_municipality_dashboard_analytics() to authenticated;
