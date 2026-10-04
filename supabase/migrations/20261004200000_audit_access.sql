-- MobiGest — acesso institucional à auditoria municipal e global

insert into public.role_permissions (role, permission_id, allowed)
select 'admin_municipal', p.id, true
from public.permissions p
where p.code = 'audit.view'
on conflict (role, permission_id)
do update set allowed = excluded.allowed;

create or replace function public.list_municipal_audit_logs(
  p_limit integer default 500
)
returns table (
  id uuid,
  actor_user_id uuid,
  actor_name text,
  actor_role text,
  municipality_id uuid,
  municipality_name text,
  module text,
  action text,
  entity_type text,
  entity_id uuid,
  result text,
  reference text,
  old_values jsonb,
  new_values jsonb,
  observation text,
  origin text,
  created_at timestamptz
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
    'audit.view'
  )) then
    raise exception 'Sem permissão para consultar a auditoria municipal';
  end if;

  return query
  select
    a.id,
    a.actor_user_id,
    coalesce(p.full_name, 'Utilizador não identificado'),
    a.actor_role,
    a.municipality_id,
    coalesce(m.name, 'Município'),
    a.module,
    a.action,
    a.entity_type,
    a.entity_id,
    a.result,
    a.reference,
    a.old_values,
    a.new_values,
    a.observation,
    a.origin,
    a.created_at
  from public.audit_logs a
  left join public.profiles p
    on p.id = a.actor_user_id
  left join public.municipalities m
    on m.id = a.municipality_id
  where a.municipality_id = v_municipality
  order by a.created_at desc
  limit greatest(1, least(coalesce(p_limit, 500), 2000));
end;
$$;

create or replace function public.list_global_audit_logs(
  p_limit integer default 1000
)
returns table (
  id uuid,
  actor_user_id uuid,
  actor_name text,
  actor_role text,
  municipality_id uuid,
  municipality_name text,
  module text,
  action text,
  entity_type text,
  entity_id uuid,
  result text,
  reference text,
  old_values jsonb,
  new_values jsonb,
  observation text,
  origin text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.is_super_admin()) then
    raise exception 'Apenas o Super Administrador pode consultar a auditoria global';
  end if;

  return query
  select
    a.id,
    a.actor_user_id,
    coalesce(p.full_name, 'Utilizador não identificado'),
    a.actor_role,
    a.municipality_id,
    coalesce(m.name, 'Global'),
    a.module,
    a.action,
    a.entity_type,
    a.entity_id,
    a.result,
    a.reference,
    a.old_values,
    a.new_values,
    a.observation,
    a.origin,
    a.created_at
  from public.audit_logs a
  left join public.profiles p
    on p.id = a.actor_user_id
  left join public.municipalities m
    on m.id = a.municipality_id
  order by a.created_at desc
  limit greatest(1, least(coalesce(p_limit, 1000), 5000));
end;
$$;

revoke all on function public.list_municipal_audit_logs(integer) from public;
revoke all on function public.list_global_audit_logs(integer) from public;

grant execute on function public.list_municipal_audit_logs(integer) to authenticated;
grant execute on function public.list_global_audit_logs(integer) to authenticated;
