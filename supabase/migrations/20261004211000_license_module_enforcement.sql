-- MobiGest — enforcement dos módulos incluídos no plano de licença

create or replace function private.permission_module(
  p_permission_code text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_permission_code like 'vehicles.%' then 'vehicles'
    when p_permission_code like 'owners.%' then 'owners'
    when p_permission_code like 'registrations.%' then 'registrations'
    when p_permission_code like 'documents.%' then 'documents'
    when p_permission_code like 'fiscalization.%' then 'fiscalization'
    when p_permission_code like 'finance.%' then 'finance'
    when p_permission_code like 'reports.%' then 'reports'
    when p_permission_code like 'users.%' then 'users'
    when p_permission_code like 'settings.%' then 'settings'
    when p_permission_code like 'municipalities.%' then 'municipalities'
    when p_permission_code like 'ownership.%' then 'transfers'
    when p_permission_code like 'drivers.%' then 'drivers'
    when p_permission_code like 'fines.%'
      or p_permission_code like 'fine_types.%' then 'fines'
    when p_permission_code = 'audit.view' then 'audit'
    else 'core'
  end;
$$;

revoke all on function private.permission_module(text) from public;

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
        or p.modules ? 'core'
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

create or replace function private.authorize(permission_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select private.is_super_admin())
    or exists (
      select 1
      from public.profiles p
      join public.role_permissions rp
        on rp.role = p.role
      join public.permissions pe
        on pe.id = rp.permission_id
      where p.id = (select auth.uid())
        and p.status = 'activo'
        and p.municipality_id is not null
        and (select private.municipality_has_active_license(p.municipality_id))
        and (select private.license_allows_permission(
          p.municipality_id,
          permission_code
        ))
        and rp.allowed = true
        and pe.code = permission_code
    );
$$;
