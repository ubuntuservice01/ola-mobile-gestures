-- MobiGest — correcção estrita do mapeamento de módulos da licença

create or replace function private.license_allows_permission(
  p_municipality_id uuid,
  p_permission_code text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select
      (
        p.modules ? 'all'
        or p.modules ? private.permission_module(p_permission_code)
      )
    from public.licenses l
    join public.license_plans p on p.id = l.plan_id
    where l.municipality_id = p_municipality_id
      and l.status = 'activa'
      and (l.starts_at is null or l.starts_at <= current_date)
      and (l.ends_at is null or l.ends_at >= current_date)
      and p.active
    order by l.ends_at desc nulls last, l.created_at desc
    limit 1
  ), false);
$$;

revoke all on function private.license_allows_permission(uuid,text) from public;
