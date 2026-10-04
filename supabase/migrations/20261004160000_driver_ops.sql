-- MobiGest — operações auditadas de Taxistas/Condutores e numeração por série

create table if not exists public.driver_reference_counters (
  municipality_id uuid not null
    references public.municipalities(id) on delete cascade,
  series text not null check (series in ('MTX','CDT')),
  current_value bigint not null default 0 check (current_value >= 0),
  updated_at timestamptz not null default now(),
  primary key (municipality_id, series)
);

grant select on public.driver_reference_counters to authenticated, service_role;
grant insert, update, delete on public.driver_reference_counters to service_role;
revoke all on public.driver_reference_counters from anon;
alter table public.driver_reference_counters enable row level security;

drop policy if exists driver_reference_counters_select on public.driver_reference_counters;
create policy driver_reference_counters_select
on public.driver_reference_counters for select to authenticated
using (
  (select private.same_municipality(municipality_id))
  and (select private.current_role()) in ('super_admin','admin_municipal')
);

create unique index if not exists drivers_document_unique_per_municipality_idx
on public.drivers (
  municipality_id,
  lower(document_type),
  upper(document_number)
)
where document_type is not null
  and trim(document_type) <> ''
  and document_number is not null
  and trim(document_number) <> '';

create or replace function private.driver_series(
  p_driver_type text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_driver_type in ('taxista','mototaxista') then 'MTX'
    else 'CDT'
  end;
$$;

revoke all on function private.driver_series(text) from public;

create or replace function private.next_driver_reference_v2(
  p_municipality_id uuid,
  p_driver_type text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_series text := (select private.driver_series(p_driver_type));
  v_code text;
  v_value bigint;
begin
  if p_driver_type not in ('taxista','mototaxista','condutor','outro') then
    raise exception 'Tipo de condutor inválido';
  end if;

  select code into v_code
  from public.municipalities
  where id = p_municipality_id;

  if v_code is null then
    raise exception 'Município não encontrado';
  end if;

  insert into public.driver_reference_counters (
    municipality_id,
    series,
    current_value
  )
  values (
    p_municipality_id,
    v_series,
    1
  )
  on conflict (municipality_id, series)
  do update set
    current_value = public.driver_reference_counters.current_value + 1,
    updated_at = now()
  returning current_value into v_value;

  return
    v_series || '-' ||
    upper(v_code) || '-' ||
    lpad(v_value::text, 6, '0');
end;
$$;

revoke all on function private.next_driver_reference_v2(uuid,text) from public;

create or replace function public.create_driver(
  p_driver_type text,
  p_full_name text,
  p_document_type text default null,
  p_document_number text default null,
  p_nuit text default null,
  p_phone text default null,
  p_email text default null,
  p_birth_date date default null,
  p_address text default null,
  p_administrative_post_id uuid default null,
  p_locality_id uuid default null,
  p_vehicle_id uuid default null
)
returns table (
  driver_id uuid,
  driver_reference text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_municipality uuid := (select private.current_operational_municipality_id());
  v_driver_id uuid;
  v_reference text;
  v_vehicle_municipality uuid;
begin
  if v_actor is null or v_municipality is null then
    raise exception 'Contexto municipal não disponível';
  end if;

  if not (select private.can_operate_in_municipality(
    v_municipality,
    'drivers.create'
  )) then
    raise exception 'Sem permissão para registar taxistas/condutores';
  end if;

  if p_driver_type not in ('taxista','mototaxista','condutor','outro') then
    raise exception 'Tipo de condutor inválido';
  end if;

  if nullif(trim(p_full_name), '') is null then
    raise exception 'Nome completo é obrigatório';
  end if;

  if p_vehicle_id is not null then
    select municipality_id into v_vehicle_municipality
    from public.vehicles
    where id = p_vehicle_id;

    if v_vehicle_municipality is null
       or v_vehicle_municipality <> v_municipality then
      raise exception 'Veículo inválido para este município';
    end if;
  end if;

  v_reference :=
    private.next_driver_reference_v2(v_municipality, p_driver_type);

  insert into public.drivers (
    municipality_id,
    administrative_post_id,
    locality_id,
    driver_type,
    reference,
    full_name,
    document_type,
    document_number,
    nuit,
    phone,
    email,
    birth_date,
    address,
    qr_code,
    status,
    created_by,
    updated_by
  )
  values (
    v_municipality,
    p_administrative_post_id,
    p_locality_id,
    p_driver_type,
    v_reference,
    trim(p_full_name),
    nullif(trim(p_document_type), ''),
    nullif(upper(trim(p_document_number)), ''),
    nullif(trim(p_nuit), ''),
    nullif(trim(p_phone), ''),
    nullif(lower(trim(p_email)), ''),
    p_birth_date,
    nullif(trim(p_address), ''),
    v_reference,
    'activo',
    v_actor,
    v_actor
  )
  returning id into v_driver_id;

  if p_vehicle_id is not null then
    insert into public.driver_vehicles (
      municipality_id,
      driver_id,
      vehicle_id,
      is_primary,
      starts_at,
      status,
      created_by
    )
    values (
      v_municipality,
      v_driver_id,
      p_vehicle_id,
      true,
      current_date,
      'activo',
      v_actor
    );
  end if;

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
    (select private.current_role()),
    v_municipality,
    'drivers',
    'create',
    'driver',
    v_driver_id,
    'success',
    v_reference,
    jsonb_build_object(
      'driver_type', p_driver_type,
      'full_name', trim(p_full_name),
      'vehicle_id', p_vehicle_id,
      'status', 'activo'
    ),
    'Taxista/condutor registado',
    'web'
  );

  return query select v_driver_id, v_reference;
exception
  when unique_violation then
    raise exception 'Já existe um taxista/condutor com este documento ou referência';
end;
$$;

create or replace function public.update_driver(
  p_driver_id uuid,
  p_driver_type text,
  p_full_name text,
  p_document_type text default null,
  p_document_number text default null,
  p_nuit text default null,
  p_phone text default null,
  p_email text default null,
  p_birth_date date default null,
  p_address text default null,
  p_administrative_post_id uuid default null,
  p_locality_id uuid default null,
  p_vehicle_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_old public.drivers%rowtype;
  v_new public.drivers%rowtype;
  v_vehicle_municipality uuid;
begin
  select * into v_old
  from public.drivers
  where id = p_driver_id
  for update;

  if v_old.id is null then
    raise exception 'Taxista/condutor não encontrado';
  end if;

  if not (select private.can_operate_in_municipality(
    v_old.municipality_id,
    'drivers.update'
  )) then
    raise exception 'Sem permissão para editar este taxista/condutor';
  end if;

  if p_driver_type not in ('taxista','mototaxista','condutor','outro') then
    raise exception 'Tipo de condutor inválido';
  end if;

  if nullif(trim(p_full_name), '') is null then
    raise exception 'Nome completo é obrigatório';
  end if;

  if private.driver_series(p_driver_type) <>
     private.driver_series(v_old.driver_type) then
    raise exception 'Não é permitido mudar a série MTX/CDT depois da criação';
  end if;

  if p_vehicle_id is not null then
    select municipality_id into v_vehicle_municipality
    from public.vehicles
    where id = p_vehicle_id;

    if v_vehicle_municipality is null
       or v_vehicle_municipality <> v_old.municipality_id then
      raise exception 'Veículo inválido para este município';
    end if;
  end if;

  update public.drivers
  set
    administrative_post_id = p_administrative_post_id,
    locality_id = p_locality_id,
    driver_type = p_driver_type,
    full_name = trim(p_full_name),
    document_type = nullif(trim(p_document_type), ''),
    document_number = nullif(upper(trim(p_document_number)), ''),
    nuit = nullif(trim(p_nuit), ''),
    phone = nullif(trim(p_phone), ''),
    email = nullif(lower(trim(p_email)), ''),
    birth_date = p_birth_date,
    address = nullif(trim(p_address), ''),
    updated_by = v_actor
  where id = p_driver_id
  returning * into v_new;

  update public.driver_vehicles
  set
    status = 'inactivo',
    ends_at = current_date
  where driver_id = p_driver_id
    and status = 'activo'
    and (p_vehicle_id is null or vehicle_id <> p_vehicle_id);

  if p_vehicle_id is not null and not exists (
    select 1
    from public.driver_vehicles dv
    where dv.driver_id = p_driver_id
      and dv.vehicle_id = p_vehicle_id
      and dv.status = 'activo'
  ) then
    insert into public.driver_vehicles (
      municipality_id,
      driver_id,
      vehicle_id,
      is_primary,
      starts_at,
      status,
      created_by
    )
    values (
      v_old.municipality_id,
      p_driver_id,
      p_vehicle_id,
      true,
      current_date,
      'activo',
      v_actor
    );
  end if;

  update public.driver_vehicles
  set is_primary = (vehicle_id = p_vehicle_id)
  where driver_id = p_driver_id
    and status = 'activo';

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
    (select private.current_role()),
    v_old.municipality_id,
    'drivers',
    'update',
    'driver',
    p_driver_id,
    'success',
    v_old.reference,
    jsonb_build_object(
      'driver_type', v_old.driver_type,
      'full_name', v_old.full_name
    ),
    jsonb_build_object(
      'driver_type', v_new.driver_type,
      'full_name', v_new.full_name,
      'vehicle_id', p_vehicle_id
    ),
    'Taxista/condutor actualizado',
    'web'
  );
exception
  when unique_violation then
    raise exception 'Já existe um taxista/condutor com este documento';
end;
$$;

create or replace function public.set_driver_status(
  p_driver_id uuid,
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
  v_old public.drivers%rowtype;
begin
  if p_status not in ('activo','suspenso','inactivo','bloqueado') then
    raise exception 'Estado do taxista/condutor inválido';
  end if;

  if nullif(trim(p_reason), '') is null then
    raise exception 'Motivo da alteração é obrigatório';
  end if;

  select * into v_old
  from public.drivers
  where id = p_driver_id
  for update;

  if v_old.id is null then
    raise exception 'Taxista/condutor não encontrado';
  end if;

  if not (select private.can_operate_in_municipality(
    v_old.municipality_id,
    'drivers.update'
  )) then
    raise exception 'Sem permissão para alterar este taxista/condutor';
  end if;

  if v_old.status = p_status then
    raise exception 'O taxista/condutor já possui este estado';
  end if;

  update public.drivers
  set
    status = p_status,
    updated_by = v_actor
  where id = p_driver_id;

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
    (select private.current_role()),
    v_old.municipality_id,
    'drivers',
    'change_status',
    'driver',
    p_driver_id,
    'success',
    v_old.reference,
    jsonb_build_object('status', v_old.status),
    jsonb_build_object('status', p_status),
    trim(p_reason),
    'web'
  );
end;
$$;

revoke all on function public.create_driver(text,text,text,text,text,text,text,date,text,uuid,uuid,uuid) from public;
revoke all on function public.update_driver(uuid,text,text,text,text,text,text,text,date,text,uuid,uuid,uuid) from public;
revoke all on function public.set_driver_status(uuid,text,text) from public;

grant execute on function public.create_driver(text,text,text,text,text,text,text,date,text,uuid,uuid,uuid) to authenticated;
grant execute on function public.update_driver(uuid,text,text,text,text,text,text,text,date,text,uuid,uuid,uuid) to authenticated;
grant execute on function public.set_driver_status(uuid,text,text) to authenticated;

revoke insert, update, delete on public.drivers from authenticated;
revoke insert, update, delete on public.driver_vehicles from authenticated;
grant select on public.drivers, public.driver_vehicles to authenticated;
