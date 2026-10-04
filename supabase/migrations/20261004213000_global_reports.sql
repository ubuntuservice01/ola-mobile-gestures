-- MobiGest — relatório global agregado do Super Administrador

create or replace function public.super_admin_global_report(
  p_from date default null,
  p_to date default null
)
returns table (
  municipality_id uuid,
  municipality_name text,
  municipality_code text,
  municipality_status text,
  vehicles_total bigint,
  owners_total bigint,
  users_active bigint,
  registrations_period bigint,
  fiscalizations_period bigint,
  fines_period bigint,
  revenue_period numeric,
  pending_amount numeric,
  license_code text,
  license_plan text,
  license_status text,
  license_ends_at date
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.is_super_admin()) then
    raise exception 'Apenas o Super Administrador pode consultar relatórios globais';
  end if;

  if (select private.current_super_admin_access_municipality()) is not null then
    raise exception 'Termine o acesso municipal antes de consultar relatórios globais';
  end if;

  if p_from is not null and p_to is not null and p_to < p_from then
    raise exception 'Período inválido';
  end if;

  return query
  select
    m.id,
    m.name,
    m.code,
    m.status,
    (
      select count(*)
      from public.vehicles v
      where v.municipality_id = m.id
        and v.status <> 'cancelada'
    ) as vehicles_total,
    (
      select count(*)
      from public.owners o
      where o.municipality_id = m.id
        and o.status <> 'inactivo'
    ) as owners_total,
    (
      select count(*)
      from public.profiles p
      where p.municipality_id = m.id
        and p.status = 'activo'
    ) as users_active,
    (
      select count(*)
      from public.registrations r
      where r.municipality_id = m.id
        and (p_from is null or r.created_at >= p_from::timestamptz)
        and (
          p_to is null
          or r.created_at < (p_to + 1)::timestamptz
        )
    ) as registrations_period,
    (
      select count(*)
      from public.fiscalizations fz
      where fz.municipality_id = m.id
        and (p_from is null or fz.occurred_at >= p_from::timestamptz)
        and (
          p_to is null
          or fz.occurred_at < (p_to + 1)::timestamptz
        )
    ) as fiscalizations_period,
    (
      select count(*)
      from public.fines f
      where f.municipality_id = m.id
        and (p_from is null or f.occurred_at >= p_from::timestamptz)
        and (
          p_to is null
          or f.occurred_at < (p_to + 1)::timestamptz
        )
    ) as fines_period,
    coalesce((
      select sum(p.amount)
      from public.payments p
      join public.charges c on c.id = p.charge_id
      where c.municipality_id = m.id
        and p.paid_at is not null
        and (p_from is null or p.paid_at >= p_from::timestamptz)
        and (
          p_to is null
          or p.paid_at < (p_to + 1)::timestamptz
        )
    ), 0)::numeric as revenue_period,
    coalesce((
      select sum(c.amount)
      from public.charges c
      where c.municipality_id = m.id
        and c.status in ('pendente','em_confirmacao')
    ), 0)::numeric as pending_amount,
    current_license.license_code,
    current_license.plan_name,
    current_license.effective_status,
    current_license.ends_at
  from public.municipalities m
  left join lateral (
    select
      l.license_code,
      lp.name as plan_name,
      case
        when l.status = 'activa'
             and l.starts_at is not null
             and l.starts_at > current_date then 'aguarda_inicio'
        when l.status = 'activa'
             and l.ends_at is not null
             and l.ends_at < current_date then 'expirada'
        else l.status
      end as effective_status,
      l.ends_at
    from public.licenses l
    join public.license_plans lp on lp.id = l.plan_id
    where l.municipality_id = m.id
    order by
      case
        when l.status in ('activa','suspensa','em_configuracao') then 0
        else 1
      end,
      l.created_at desc
    limit 1
  ) current_license on true
  order by m.name;
end;
$$;

revoke all on function public.super_admin_global_report(date,date) from public;
grant execute on function public.super_admin_global_report(date,date) to authenticated;
