-- MobiGest — sessão municipal temporária e auditada do Super Administrador
-- Fecha a ponte entre Administração Global e operação de um município.

-- Apenas uma sessão activa e não encerrada por Super Administrador.
create unique index if not exists municipal_access_one_open_per_admin_idx
on public.municipal_access_sessions(super_admin_id)
where status = 'activa' and ended_at is null;

create or replace function private.current_super_admin_access_municipality()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.municipality_id
  from public.municipal_access_sessions s
  where s.super_admin_id = (select auth.uid())
    and s.status = 'activa'
    and s.ended_at is null
    and s.expires_at > now()
  order by s.starts_at desc
  limit 1;
$$;

create or replace function private.super_admin_has_assistance(
  p_municipality_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.municipal_access_sessions s
    where s.super_admin_id = (select auth.uid())
      and s.municipality_id = p_municipality_id
      and s.mode = 'assistencia'
      and s.status = 'activa'
      and s.ended_at is null
      and s.expires_at > now()
  );
$$;

revoke all on function private.current_super_admin_access_municipality() from public;
revoke all on function private.super_admin_has_assistance(uuid) from public;
grant execute on function private.current_super_admin_access_municipality() to authenticated;
grant execute on function private.super_admin_has_assistance(uuid) to authenticated;

-- Durante uma sessão municipal, até o Super Admin fica territorialmente limitado
-- ao município seleccionado. Fora de uma sessão, mantém a visão global.
create or replace function private.same_municipality(target_municipality_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    case
      when (select private.is_super_admin()) then
        coalesce(
          target_municipality_id = (select private.current_super_admin_access_municipality()),
          (select private.current_super_admin_access_municipality()) is null
        )
      else
        target_municipality_id is not null
        and target_municipality_id = (select private.current_municipality_id())
    end;
$$;

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

  -- Encerra qualquer sessão anterior ainda aberta.
  update public.municipal_access_sessions
  set
    ended_at = now(),
    status = case when expires_at <= now() then 'expirada' else 'terminada' end
  where super_admin_id = v_actor
    and status = 'activa'
    and ended_at is null;

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

  update public.municipal_access_sessions
  set status = 'expirada'
  where super_admin_id = v_actor
    and status = 'activa'
    and ended_at is null
    and expires_at <= now();

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
  join public.municipalities m on m.id = s.municipality_id
  where s.super_admin_id = v_actor
    and s.status = 'activa'
    and s.ended_at is null
    and s.expires_at > now()
  order by s.starts_at desc
  limit 1;
end;
$$;

create or replace function public.super_admin_end_municipal_access(
  p_session_id uuid,
  p_reason text default 'Encerramento manual'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_session public.municipal_access_sessions%rowtype;
begin
  if v_actor is null or not (select private.is_super_admin()) then
    raise exception 'Acesso negado';
  end if;

  select *
    into v_session
  from public.municipal_access_sessions
  where id = p_session_id
    and super_admin_id = v_actor
  for update;

  if v_session.id is null then
    raise exception 'Sessão municipal não encontrada';
  end if;

  if v_session.status <> 'activa' or v_session.ended_at is not null then
    return;
  end if;

  update public.municipal_access_sessions
  set
    ended_at = now(),
    status = case when expires_at <= now() then 'expirada' else 'terminada' end
  where id = p_session_id;

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
    old_values,
    new_values,
    observation,
    origin
  )
  values (
    v_actor,
    'super_admin',
    v_session.municipality_id,
    'municipal_access',
    'end',
    'municipal_access_session',
    v_session.id,
    'success',
    v_session.audit_reference,
    jsonb_build_object(
      'status', v_session.status,
      'mode', v_session.mode,
      'expires_at', v_session.expires_at
    ),
    jsonb_build_object(
      'status', case when v_session.expires_at <= now() then 'expirada' else 'terminada' end,
      'ended_at', now()
    ),
    coalesce(nullif(trim(p_reason), ''), 'Encerramento manual'),
    'web'
  );
end;
$$;

revoke all on function public.super_admin_start_municipal_access(uuid,text,text,integer) from public;
revoke all on function public.super_admin_current_municipal_access() from public;
revoke all on function public.super_admin_end_municipal_access(uuid,text) from public;

grant execute on function public.super_admin_start_municipal_access(uuid,text,text,integer) to authenticated;
grant execute on function public.super_admin_current_municipal_access() to authenticated;
grant execute on function public.super_admin_end_municipal_access(uuid,text) to authenticated;

-- Sessões não podem ser criadas/alteradas directamente pelo browser.
revoke insert, update, delete on public.municipal_access_sessions from authenticated;
grant select on public.municipal_access_sessions to authenticated;

-- Em tabelas operacionais, Super Admin só pode escrever durante Assistência
-- activa para o município alvo. Utilizadores municipais continuam sujeitos ao RLS.
create or replace function private.enforce_super_admin_assistance_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_municipality_id uuid;
  v_parent_id uuid;
begin
  if not (select private.is_super_admin()) then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_municipality_id := nullif(v_row ->> 'municipality_id', '')::uuid;

  if v_municipality_id is null then
    case tg_table_name
      when 'owner_contacts' then
        v_parent_id := nullif(v_row ->> 'owner_id', '')::uuid;
        select o.municipality_id into v_municipality_id
        from public.owners o where o.id = v_parent_id;

      when 'registration_decisions' then
        v_parent_id := nullif(v_row ->> 'registration_id', '')::uuid;
        select r.municipality_id into v_municipality_id
        from public.registrations r where r.id = v_parent_id;

      when 'vehicle_status_history' then
        v_parent_id := nullif(v_row ->> 'vehicle_id', '')::uuid;
        select v.municipality_id into v_municipality_id
        from public.vehicles v where v.id = v_parent_id;

      when 'ownership_history' then
        v_parent_id := nullif(v_row ->> 'vehicle_id', '')::uuid;
        select v.municipality_id into v_municipality_id
        from public.vehicles v where v.id = v_parent_id;

      when 'fiscalization_evidence' then
        v_parent_id := nullif(v_row ->> 'fiscalization_id', '')::uuid;
        select f.municipality_id into v_municipality_id
        from public.fiscalizations f where f.id = v_parent_id;

      when 'payments' then
        v_parent_id := nullif(v_row ->> 'charge_id', '')::uuid;
        select ch.municipality_id into v_municipality_id
        from public.charges ch where ch.id = v_parent_id;

      else
        v_municipality_id := null;
    end case;
  end if;

  if v_municipality_id is null then
    raise exception 'Não foi possível determinar o município da operação em %', tg_table_name;
  end if;

  if not (select private.super_admin_has_assistance(v_municipality_id)) then
    raise exception 'Esta operação exige uma sessão activa em modo Assistência para o município';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_super_admin_assistance_write() from public;

do $$
declare
  t text;
  trigger_name text;
begin
  foreach t in array array[
    'administrative_posts',
    'localities',
    'owners',
    'owner_contacts',
    'vehicles',
    'registrations',
    'registration_decisions',
    'documents',
    'document_requirements',
    'vehicle_status_history',
    'ownership_history',
    'fiscalizations',
    'fiscalization_evidence',
    'fee_configs',
    'charges',
    'payments',
    'drivers',
    'driver_vehicles',
    'fine_types',
    'fines'
  ]
  loop
    trigger_name := t || '_super_admin_assistance_guard';
    execute format('drop trigger if exists %I on public.%I', trigger_name, t);
    execute format(
      'create trigger %I before insert or update or delete on public.%I for each row execute function private.enforce_super_admin_assistance_write()',
      trigger_name,
      t
    );
  end loop;
end $$;


-- O contexto municipal também restringe as políticas que historicamente davam
-- visão global directa ao Super Admin.
drop policy if exists "municipalities_select_scoped" on public.municipalities;
create policy "municipalities_select_scoped"
on public.municipalities for select to authenticated
using (
  case
    when (select private.is_super_admin()) then
      (select private.current_super_admin_access_municipality()) is null
      or id = (select private.current_super_admin_access_municipality())
    else
      id = (select private.current_municipality_id())
  end
);

drop policy if exists "profiles_select_self_or_manager" on public.profiles;
create policy "profiles_select_self_or_manager"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or (
    (select private.is_super_admin())
    and (
      (select private.current_super_admin_access_municipality()) is null
      or municipality_id = (select private.current_super_admin_access_municipality())
    )
  )
  or (
    (select private.current_role()) = 'admin_municipal'
    and municipality_id = (select private.current_municipality_id())
  )
);

drop policy if exists "licenses_select_scoped" on public.licenses;
create policy "licenses_select_scoped"
on public.licenses for select to authenticated
using (
  case
    when (select private.is_super_admin()) then
      (select private.current_super_admin_access_municipality()) is null
      or municipality_id = (select private.current_super_admin_access_municipality())
    else
      municipality_id = (select private.current_municipality_id())
      and (select private.authorize('settings.view'))
  end
);

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications for select to authenticated
using (
  recipient_user_id = (select auth.uid())
  or (
    (select private.is_super_admin())
    and (
      (select private.current_super_admin_access_municipality()) is null
      or municipality_id = (select private.current_super_admin_access_municipality())
    )
  )
);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications for update to authenticated
using (
  recipient_user_id = (select auth.uid())
  or (
    (select private.is_super_admin())
    and (
      (select private.current_super_admin_access_municipality()) is null
      or municipality_id = (select private.current_super_admin_access_municipality())
    )
  )
)
with check (
  recipient_user_id = (select auth.uid())
  or (
    (select private.is_super_admin())
    and (
      (select private.current_super_admin_access_municipality()) is null
      or municipality_id = (select private.current_super_admin_access_municipality())
    )
  )
);

drop policy if exists "audit_logs_select_scoped" on public.audit_logs;
create policy "audit_logs_select_scoped"
on public.audit_logs for select to authenticated
using (
  (
    (select private.is_super_admin())
    and (
      (select private.current_super_admin_access_municipality()) is null
      or municipality_id = (select private.current_super_admin_access_municipality())
    )
  )
  or (
    municipality_id = (select private.current_municipality_id())
    and (select private.authorize('audit.view'))
  )
);
