-- MobiGest — gestão de licenças, planos, limites e enforcement de acesso

alter table public.license_plans
  add column if not exists description text;

create table if not exists public.license_numbering_counters (
  year integer primary key
    check (year between 2000 and 2100),
  current_value bigint not null default 0
    check (current_value >= 0),
  updated_at timestamptz not null default now()
);

revoke all on public.license_numbering_counters from anon, authenticated;
grant select, insert, update, delete on public.license_numbering_counters to service_role;
alter table public.license_numbering_counters enable row level security;

create unique index if not exists licenses_one_current_per_municipality_idx
on public.licenses(municipality_id)
where status in ('em_configuracao','activa','suspensa');

create or replace function private.next_license_code(
  p_municipality_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_year integer := extract(year from now())::integer;
  v_value bigint;
begin
  select code into v_code
  from public.municipalities
  where id = p_municipality_id;

  if v_code is null then
    raise exception 'Município não encontrado';
  end if;

  insert into public.license_numbering_counters(year, current_value)
  values (v_year, 1)
  on conflict (year)
  do update set
    current_value = public.license_numbering_counters.current_value + 1,
    updated_at = now()
  returning current_value into v_value;

  return
    'LIC-' ||
    upper(v_code) ||
    '-' ||
    v_year::text ||
    '-' ||
    lpad(v_value::text, 6, '0');
end;
$$;

revoke all on function private.next_license_code(uuid) from public;

create or replace function private.municipality_has_active_license(
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
    from public.licenses l
    where l.municipality_id = p_municipality_id
      and l.status = 'activa'
      and (l.starts_at is null or l.starts_at <= current_date)
      and (l.ends_at is null or l.ends_at >= current_date)
  );
$$;

revoke all on function private.municipality_has_active_license(uuid) from public;

create or replace function private.effective_license_limits(
  p_municipality_id uuid
)
returns table (
  max_users integer,
  max_vehicles integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(l.max_users, p.max_users),
    coalesce(l.max_vehicles, p.max_vehicles)
  from public.licenses l
  join public.license_plans p on p.id = l.plan_id
  where l.municipality_id = p_municipality_id
    and l.status = 'activa'
    and (l.starts_at is null or l.starts_at <= current_date)
    and (l.ends_at is null or l.ends_at >= current_date)
  order by l.ends_at desc nulls last, l.created_at desc
  limit 1;
$$;

revoke all on function private.effective_license_limits(uuid) from public;

create or replace function private.enforce_profile_license_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer;
  v_count integer;
begin
  if new.municipality_id is null or new.role = 'super_admin' then
    return new;
  end if;

  if new.status <> 'activo' then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.status = new.status
     and old.municipality_id is not distinct from new.municipality_id then
    return new;
  end if;

  select limits.max_users
    into v_limit
  from private.effective_license_limits(new.municipality_id) limits;

  if not found then
    raise exception 'O município não possui uma licença activa e válida';
  end if;

  if v_limit is null then
    return new;
  end if;

  select count(*)
    into v_count
  from public.profiles p
  where p.municipality_id = new.municipality_id
    and p.status = 'activo'
    and p.id <> new.id;

  if v_count >= v_limit then
    raise exception 'O limite de utilizadores da licença foi atingido';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_profile_license_limit() from public;

drop trigger if exists profiles_license_limit_guard on public.profiles;
create trigger profiles_license_limit_guard
before insert or update of status, municipality_id, role on public.profiles
for each row execute function private.enforce_profile_license_limit();

create or replace function private.enforce_vehicle_license_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer;
  v_count integer;
begin
  if new.status = 'cancelada' then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.status = new.status
     and old.municipality_id is not distinct from new.municipality_id then
    return new;
  end if;

  select limits.max_vehicles
    into v_limit
  from private.effective_license_limits(new.municipality_id) limits;

  if not found then
    raise exception 'O município não possui uma licença activa e válida';
  end if;

  if v_limit is null then
    return new;
  end if;

  select count(*)
    into v_count
  from public.vehicles v
  where v.municipality_id = new.municipality_id
    and v.status <> 'cancelada'
    and v.id <> new.id;

  if v_count >= v_limit then
    raise exception 'O limite de veículos da licença foi atingido';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_vehicle_license_limit() from public;

drop trigger if exists vehicles_license_limit_guard on public.vehicles;
create trigger vehicles_license_limit_guard
before insert or update of status, municipality_id on public.vehicles
for each row execute function private.enforce_vehicle_license_limit();

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
        and rp.allowed = true
        and pe.code = permission_code
    );
$$;

create or replace function public.current_license_access()
returns table (
  municipality_id uuid,
  license_id uuid,
  license_code text,
  plan_id uuid,
  plan_name text,
  effective_status text,
  starts_at date,
  ends_at date,
  max_users integer,
  max_vehicles integer,
  modules jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_municipality uuid := (select private.current_operational_municipality_id());
begin
  if (select auth.uid()) is null or v_municipality is null then
    return;
  end if;

  return query
  select
    v_municipality,
    l.id,
    l.license_code,
    l.plan_id,
    p.name,
    case
      when l.id is null then 'sem_licenca'
      when l.status = 'cancelada' then 'cancelada'
      when l.status = 'suspensa' then 'suspensa'
      when l.status = 'em_configuracao' then 'em_configuracao'
      when l.status = 'expirada' then 'expirada'
      when l.status = 'activa'
           and l.starts_at is not null
           and l.starts_at > current_date then 'aguarda_inicio'
      when l.status = 'activa'
           and l.ends_at is not null
           and l.ends_at < current_date then 'expirada'
      when l.status = 'activa' then 'activa'
      else coalesce(l.status, 'sem_licenca')
    end,
    l.starts_at,
    l.ends_at,
    coalesce(l.max_users, p.max_users),
    coalesce(l.max_vehicles, p.max_vehicles),
    coalesce(p.modules, '[]'::jsonb)
  from (select 1) seed
  left join lateral (
    select lic.*
    from public.licenses lic
    where lic.municipality_id = v_municipality
      and lic.status <> 'cancelada'
    order by
      case lic.status
        when 'activa' then 0
        when 'suspensa' then 1
        when 'em_configuracao' then 2
        when 'expirada' then 3
        else 4
      end,
      lic.ends_at desc nulls last,
      lic.created_at desc
    limit 1
  ) l on true
  left join public.license_plans p
    on p.id = l.plan_id;
end;
$$;

revoke all on function public.current_license_access() from public;
grant execute on function public.current_license_access() to authenticated;

create or replace function public.super_admin_create_license_plan(
  p_code text,
  p_name text,
  p_description text default null,
  p_max_users integer default null,
  p_max_vehicles integer default null,
  p_modules jsonb default '[]'::jsonb,
  p_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_id uuid;
begin
  if v_actor is null or not (select private.is_super_admin()) then
    raise exception 'Apenas o Super Administrador pode gerir planos';
  end if;

  if nullif(trim(p_code), '') is null or nullif(trim(p_name), '') is null then
    raise exception 'Código e nome do plano são obrigatórios';
  end if;

  if p_max_users is not null and p_max_users <= 0 then
    raise exception 'Limite de utilizadores inválido';
  end if;

  if p_max_vehicles is not null and p_max_vehicles <= 0 then
    raise exception 'Limite de veículos inválido';
  end if;

  if jsonb_typeof(coalesce(p_modules, '[]'::jsonb)) <> 'array' then
    raise exception 'Módulos do plano devem ser uma lista';
  end if;

  insert into public.license_plans (
    code,
    name,
    description,
    max_users,
    max_vehicles,
    modules,
    active
  )
  values (
    upper(trim(p_code)),
    trim(p_name),
    nullif(trim(p_description), ''),
    p_max_users,
    p_max_vehicles,
    coalesce(p_modules, '[]'::jsonb),
    p_active
  )
  returning id into v_id;

  insert into public.audit_logs (
    actor_user_id, actor_role, module, action, entity_type, entity_id,
    result, reference, new_values, observation, origin
  )
  values (
    v_actor, 'super_admin', 'licenses', 'create_plan',
    'license_plan', v_id, 'success', upper(trim(p_code)),
    jsonb_build_object(
      'name', trim(p_name),
      'max_users', p_max_users,
      'max_vehicles', p_max_vehicles,
      'modules', coalesce(p_modules, '[]'::jsonb),
      'active', p_active
    ),
    nullif(trim(p_description), ''),
    'web'
  );

  return v_id;
exception
  when unique_violation then
    raise exception 'Já existe um plano com este código';
end;
$$;

create or replace function public.super_admin_update_license_plan(
  p_id uuid,
  p_code text,
  p_name text,
  p_description text default null,
  p_max_users integer default null,
  p_max_vehicles integer default null,
  p_modules jsonb default '[]'::jsonb,
  p_active boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_old public.license_plans%rowtype;
  v_new public.license_plans%rowtype;
begin
  if v_actor is null or not (select private.is_super_admin()) then
    raise exception 'Apenas o Super Administrador pode gerir planos';
  end if;

  select * into v_old
  from public.license_plans
  where id = p_id
  for update;

  if v_old.id is null then
    raise exception 'Plano não encontrado';
  end if;

  if nullif(trim(p_code), '') is null or nullif(trim(p_name), '') is null then
    raise exception 'Código e nome do plano são obrigatórios';
  end if;

  if p_max_users is not null and p_max_users <= 0 then
    raise exception 'Limite de utilizadores inválido';
  end if;

  if p_max_vehicles is not null and p_max_vehicles <= 0 then
    raise exception 'Limite de veículos inválido';
  end if;

  if jsonb_typeof(coalesce(p_modules, '[]'::jsonb)) <> 'array' then
    raise exception 'Módulos do plano devem ser uma lista';
  end if;

  update public.license_plans
  set
    code = upper(trim(p_code)),
    name = trim(p_name),
    description = nullif(trim(p_description), ''),
    max_users = p_max_users,
    max_vehicles = p_max_vehicles,
    modules = coalesce(p_modules, '[]'::jsonb),
    active = p_active
  where id = p_id
  returning * into v_new;

  insert into public.audit_logs (
    actor_user_id, actor_role, module, action, entity_type, entity_id,
    result, reference, old_values, new_values, observation, origin
  )
  values (
    v_actor, 'super_admin', 'licenses', 'update_plan',
    'license_plan', p_id, 'success', v_new.code,
    to_jsonb(v_old), to_jsonb(v_new),
    'Plano de licença actualizado', 'web'
  );
exception
  when unique_violation then
    raise exception 'Já existe um plano com este código';
end;
$$;

create or replace function private.validate_license_capacity(
  p_municipality_id uuid,
  p_max_users integer,
  p_max_vehicles integer
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_users integer;
  v_vehicles integer;
begin
  if p_max_users is not null then
    select count(*) into v_users
    from public.profiles p
    where p.municipality_id = p_municipality_id
      and p.status = 'activo';

    if v_users > p_max_users then
      raise exception 'O município já possui % utilizadores activos, acima do limite %',
        v_users, p_max_users;
    end if;
  end if;

  if p_max_vehicles is not null then
    select count(*) into v_vehicles
    from public.vehicles v
    where v.municipality_id = p_municipality_id
      and v.status <> 'cancelada';

    if v_vehicles > p_max_vehicles then
      raise exception 'O município já possui % veículos, acima do limite %',
        v_vehicles, p_max_vehicles;
    end if;
  end if;
end;
$$;

revoke all on function private.validate_license_capacity(uuid,integer,integer) from public;

create or replace function public.super_admin_create_license(
  p_municipality_id uuid,
  p_plan_id uuid,
  p_starts_at date,
  p_ends_at date,
  p_status text default 'em_configuracao',
  p_max_users integer default null,
  p_max_vehicles integer default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_plan public.license_plans%rowtype;
  v_municipality public.municipalities%rowtype;
  v_id uuid;
  v_code text;
  v_effective_users integer;
  v_effective_vehicles integer;
begin
  if v_actor is null or not (select private.is_super_admin()) then
    raise exception 'Apenas o Super Administrador pode criar licenças';
  end if;

  if p_status not in ('em_configuracao','activa','suspensa') then
    raise exception 'Estado inicial da licença inválido';
  end if;

  if p_starts_at is not null and p_ends_at is not null
     and p_ends_at < p_starts_at then
    raise exception 'Fim da licença anterior ao início';
  end if;

  select * into v_municipality
  from public.municipalities
  where id = p_municipality_id;

  if v_municipality.id is null then
    raise exception 'Município não encontrado';
  end if;

  if v_municipality.status = 'inactivo' then
    raise exception 'Não é permitido licenciar um município inactivo';
  end if;

  select * into v_plan
  from public.license_plans
  where id = p_plan_id;

  if v_plan.id is null or not v_plan.active then
    raise exception 'Plano inválido ou inactivo';
  end if;

  update public.licenses
  set status = 'expirada'
  where municipality_id = p_municipality_id
    and status = 'activa'
    and ends_at is not null
    and ends_at < current_date;

  if exists (
    select 1
    from public.licenses l
    where l.municipality_id = p_municipality_id
      and l.status in ('em_configuracao','activa','suspensa')
  ) then
    raise exception 'O município já possui uma licença corrente';
  end if;

  v_effective_users := coalesce(p_max_users, v_plan.max_users);
  v_effective_vehicles := coalesce(p_max_vehicles, v_plan.max_vehicles);

  if v_effective_users is not null and v_effective_users <= 0 then
    raise exception 'Limite de utilizadores inválido';
  end if;

  if v_effective_vehicles is not null and v_effective_vehicles <= 0 then
    raise exception 'Limite de veículos inválido';
  end if;

  if p_status = 'activa' then
    perform private.validate_license_capacity(
      p_municipality_id,
      v_effective_users,
      v_effective_vehicles
    );
  end if;

  v_code := private.next_license_code(p_municipality_id);

  insert into public.licenses (
    municipality_id,
    plan_id,
    license_code,
    starts_at,
    ends_at,
    status,
    max_users,
    max_vehicles,
    notes,
    created_by
  )
  values (
    p_municipality_id,
    p_plan_id,
    v_code,
    p_starts_at,
    p_ends_at,
    p_status,
    p_max_users,
    p_max_vehicles,
    nullif(trim(p_notes), ''),
    v_actor
  )
  returning id into v_id;

  insert into public.audit_logs (
    actor_user_id, actor_role, municipality_id, module, action,
    entity_type, entity_id, result, reference, new_values, observation, origin
  )
  values (
    v_actor, 'super_admin', p_municipality_id, 'licenses', 'create',
    'license', v_id, 'success', v_code,
    jsonb_build_object(
      'plan_id', p_plan_id,
      'starts_at', p_starts_at,
      'ends_at', p_ends_at,
      'status', p_status,
      'max_users', v_effective_users,
      'max_vehicles', v_effective_vehicles
    ),
    nullif(trim(p_notes), ''),
    'web'
  );

  return v_id;
end;
$$;

create or replace function public.super_admin_update_license(
  p_license_id uuid,
  p_plan_id uuid,
  p_starts_at date,
  p_ends_at date,
  p_max_users integer default null,
  p_max_vehicles integer default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_old public.licenses%rowtype;
  v_new public.licenses%rowtype;
  v_plan public.license_plans%rowtype;
  v_effective_users integer;
  v_effective_vehicles integer;
begin
  if v_actor is null or not (select private.is_super_admin()) then
    raise exception 'Apenas o Super Administrador pode editar licenças';
  end if;

  select * into v_old
  from public.licenses
  where id = p_license_id
  for update;

  if v_old.id is null then
    raise exception 'Licença não encontrada';
  end if;

  if v_old.status = 'cancelada' then
    raise exception 'Uma licença cancelada não pode ser editada';
  end if;

  if p_starts_at is not null and p_ends_at is not null
     and p_ends_at < p_starts_at then
    raise exception 'Fim da licença anterior ao início';
  end if;

  select * into v_plan
  from public.license_plans
  where id = p_plan_id;

  if v_plan.id is null or not v_plan.active then
    raise exception 'Plano inválido ou inactivo';
  end if;

  v_effective_users := coalesce(p_max_users, v_plan.max_users);
  v_effective_vehicles := coalesce(p_max_vehicles, v_plan.max_vehicles);

  if v_old.status = 'activa' then
    perform private.validate_license_capacity(
      v_old.municipality_id,
      v_effective_users,
      v_effective_vehicles
    );
  end if;

  update public.licenses
  set
    plan_id = p_plan_id,
    starts_at = p_starts_at,
    ends_at = p_ends_at,
    max_users = p_max_users,
    max_vehicles = p_max_vehicles,
    notes = nullif(trim(p_notes), '')
  where id = p_license_id
  returning * into v_new;

  insert into public.audit_logs (
    actor_user_id, actor_role, municipality_id, module, action,
    entity_type, entity_id, result, reference, old_values, new_values,
    observation, origin
  )
  values (
    v_actor, 'super_admin', v_old.municipality_id, 'licenses', 'update',
    'license', v_old.id, 'success', v_old.license_code,
    to_jsonb(v_old), to_jsonb(v_new),
    'Licença actualizada', 'web'
  );
end;
$$;

create or replace function public.super_admin_set_license_status(
  p_license_id uuid,
  p_status text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_old public.licenses%rowtype;
  v_plan public.license_plans%rowtype;
begin
  if v_actor is null or not (select private.is_super_admin()) then
    raise exception 'Apenas o Super Administrador pode alterar licenças';
  end if;

  if p_status not in ('em_configuracao','activa','suspensa','cancelada') then
    raise exception 'Estado da licença inválido';
  end if;

  if nullif(trim(p_reason), '') is null then
    raise exception 'Motivo da alteração é obrigatório';
  end if;

  select * into v_old
  from public.licenses
  where id = p_license_id
  for update;

  if v_old.id is null then
    raise exception 'Licença não encontrada';
  end if;

  if v_old.status = 'cancelada' then
    raise exception 'Uma licença cancelada é terminal';
  end if;

  if v_old.status = p_status then
    raise exception 'A licença já possui este estado';
  end if;

  if p_status = 'activa' then
    select * into v_plan
    from public.license_plans
    where id = v_old.plan_id;

    if v_plan.id is null or not v_plan.active then
      raise exception 'O plano da licença está inactivo';
    end if;

    if v_old.starts_at is null or v_old.ends_at is null then
      raise exception 'Defina início e fim antes de activar a licença';
    end if;

    if v_old.ends_at < current_date then
      raise exception 'A licença já terminou; renove a validade antes de activar';
    end if;

    perform private.validate_license_capacity(
      v_old.municipality_id,
      coalesce(v_old.max_users, v_plan.max_users),
      coalesce(v_old.max_vehicles, v_plan.max_vehicles)
    );
  end if;

  update public.licenses
  set status = p_status
  where id = p_license_id;

  insert into public.audit_logs (
    actor_user_id, actor_role, municipality_id, module, action,
    entity_type, entity_id, result, reference, old_values, new_values,
    observation, origin
  )
  values (
    v_actor, 'super_admin', v_old.municipality_id, 'licenses', 'change_status',
    'license', v_old.id, 'success', v_old.license_code,
    jsonb_build_object('status', v_old.status),
    jsonb_build_object('status', p_status),
    trim(p_reason), 'web'
  );
end;
$$;

create or replace function public.super_admin_renew_license(
  p_license_id uuid,
  p_new_ends_at date,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_old public.licenses%rowtype;
  v_plan public.license_plans%rowtype;
  v_new public.licenses%rowtype;
begin
  if v_actor is null or not (select private.is_super_admin()) then
    raise exception 'Apenas o Super Administrador pode renovar licenças';
  end if;

  if nullif(trim(p_reason), '') is null then
    raise exception 'Motivo da renovação é obrigatório';
  end if;

  select * into v_old
  from public.licenses
  where id = p_license_id
  for update;

  if v_old.id is null then
    raise exception 'Licença não encontrada';
  end if;

  if v_old.status = 'cancelada' then
    raise exception 'Uma licença cancelada não pode ser renovada';
  end if;

  if p_new_ends_at is null
     or (v_old.ends_at is not null and p_new_ends_at <= v_old.ends_at)
     or (v_old.starts_at is not null and p_new_ends_at < v_old.starts_at) then
    raise exception 'A nova data de fim deve prolongar a licença';
  end if;

  select * into v_plan
  from public.license_plans
  where id = v_old.plan_id;

  if v_plan.id is null or not v_plan.active then
    raise exception 'O plano da licença está inactivo';
  end if;

  perform private.validate_license_capacity(
    v_old.municipality_id,
    coalesce(v_old.max_users, v_plan.max_users),
    coalesce(v_old.max_vehicles, v_plan.max_vehicles)
  );

  update public.licenses
  set
    ends_at = p_new_ends_at,
    status = 'activa'
  where id = p_license_id
  returning * into v_new;

  insert into public.audit_logs (
    actor_user_id, actor_role, municipality_id, module, action,
    entity_type, entity_id, result, reference, old_values, new_values,
    observation, origin
  )
  values (
    v_actor, 'super_admin', v_old.municipality_id, 'licenses', 'renew',
    'license', v_old.id, 'success', v_old.license_code,
    jsonb_build_object(
      'ends_at', v_old.ends_at,
      'status', v_old.status
    ),
    jsonb_build_object(
      'ends_at', v_new.ends_at,
      'status', v_new.status
    ),
    trim(p_reason), 'web'
  );
end;
$$;

revoke all on function public.super_admin_create_license_plan(text,text,text,integer,integer,jsonb,boolean) from public;
revoke all on function public.super_admin_update_license_plan(uuid,text,text,text,integer,integer,jsonb,boolean) from public;
revoke all on function public.super_admin_create_license(uuid,uuid,date,date,text,integer,integer,text) from public;
revoke all on function public.super_admin_update_license(uuid,uuid,date,date,integer,integer,text) from public;
revoke all on function public.super_admin_set_license_status(uuid,text,text) from public;
revoke all on function public.super_admin_renew_license(uuid,date,text) from public;

grant execute on function public.super_admin_create_license_plan(text,text,text,integer,integer,jsonb,boolean) to authenticated;
grant execute on function public.super_admin_update_license_plan(uuid,text,text,text,integer,integer,jsonb,boolean) to authenticated;
grant execute on function public.super_admin_create_license(uuid,uuid,date,date,text,integer,integer,text) to authenticated;
grant execute on function public.super_admin_update_license(uuid,uuid,date,date,integer,integer,text) to authenticated;
grant execute on function public.super_admin_set_license_status(uuid,text,text) to authenticated;
grant execute on function public.super_admin_renew_license(uuid,date,text) to authenticated;

revoke insert, update, delete on public.license_plans from authenticated;
revoke insert, update, delete on public.licenses from authenticated;

grant select on public.license_plans, public.licenses to authenticated;
