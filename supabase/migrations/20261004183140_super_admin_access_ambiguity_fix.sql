-- MobiGest — correcção de referências ambíguas nas sessões municipais do Super Admin

create or replace function public.super_admin_start_municipal_access(
  p_municipality_id uuid,
  p_mode text,
  p_reason text,
  p_duration_minutes integer
)
returns table (
  session_id uuid,
  municipality_id uuid,
  municipality_name text,
  municipality_code text,
  access_mode text,
  starts_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_municipality public.municipalities%rowtype;
  v_session public.municipal_access_sessions%rowtype;
  v_reference text;
begin
  if v_actor is null or not (select private.is_super_admin()) then
    raise exception 'Acesso negado';
  end if;

  if p_mode not in ('consulta', 'assistencia') then
    raise exception 'Modo de acesso inválido';
  end if;

  if p_duration_minutes not in (15, 30, 60, 120) then
    raise exception 'Duração de sessão inválida';
  end if;

  if nullif(trim(p_reason), '') is null or length(trim(p_reason)) < 4 then
    raise exception 'Informe um motivo válido para o acesso';
  end if;

  select *
  into v_municipality
  from public.municipalities
  where id = p_municipality_id;

  if v_municipality.id is null then
    raise exception 'Município não encontrado';
  end if;

  if v_municipality.status = 'inactivo' then
    raise exception 'Não é permitido iniciar acesso a um município inactivo';
  end if;

  if p_mode = 'assistencia'
     and v_municipality.status not in ('activo', 'configuracao') then
    raise exception 'Assistência operacional não é permitida no estado actual do município';
  end if;

  update public.municipal_access_sessions as mas
  set
    ended_at = now(),
    status = case
      when mas.expires_at <= now() then 'expirada'
      else 'terminada'
    end
  where mas.super_admin_id = v_actor
    and mas.status = 'activa'
    and mas.ended_at is null;

  v_reference :=
    'AMS-' ||
    upper(v_municipality.code) ||
    '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  insert into public.municipal_access_sessions (
    super_admin_id,
    municipality_id,
    mode,
    reason,
    starts_at,
    expires_at,
    status,
    audit_reference
  )
  values (
    v_actor,
    p_municipality_id,
    p_mode,
    trim(p_reason),
    now(),
    now() + make_interval(mins => p_duration_minutes),
    'activa',
    v_reference
  )
  returning * into v_session;

  insert into public.audit_logs (
    actor_user_id,
    actor_role,
    municipality_id,
    module,
    action,
    entity_type,
    entity_id,
    result,
    reference,
    new_values,
    observation,
    origin
  )
  values (
    v_actor,
    'super_admin',
    p_municipality_id,
    'municipal_access',
    'start',
    'municipal_access_session',
    v_session.id,
    'success',
    v_reference,
    jsonb_build_object(
      'mode', p_mode,
      'starts_at', v_session.starts_at,
      'expires_at', v_session.expires_at
    ),
    trim(p_reason),
    'web'
  );

  return query
  select
    v_session.id,
    v_municipality.id,
    v_municipality.name,
    v_municipality.code,
    v_session.mode,
    v_session.starts_at,
    v_session.expires_at;
end;
$$;

create or replace function public.super_admin_current_municipal_access()
returns table (
  session_id uuid,
  municipality_id uuid,
  municipality_name text,
  municipality_code text,
  access_mode text,
  reason text,
  starts_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null or not (select private.is_super_admin()) then
    return;
  end if;

  update public.municipal_access_sessions as mas
  set status = 'expirada'
  where mas.super_admin_id = v_actor
    and mas.status = 'activa'
    and mas.ended_at is null
    and mas.expires_at <= now();

  return query
  select
    s.id,
    m.id,
    m.name,
    m.code,
    s.mode,
    s.reason,
    s.starts_at,
    s.expires_at
  from public.municipal_access_sessions s
  join public.municipalities m
    on m.id = s.municipality_id
  where s.super_admin_id = v_actor
    and s.status = 'activa'
    and s.ended_at is null
    and s.expires_at > now()
  order by s.starts_at desc
  limit 1;
end;
$$;

revoke all
on function public.super_admin_start_municipal_access(uuid,text,text,integer)
from public;

revoke all
on function public.super_admin_current_municipal_access()
from public;

grant execute
on function public.super_admin_start_municipal_access(uuid,text,text,integer)
to authenticated;

grant execute
on function public.super_admin_current_municipal_access()
to authenticated;
