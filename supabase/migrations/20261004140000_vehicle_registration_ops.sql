-- MobiGest — fluxo transaccional de veículos, registos, validação e transferência

alter table public.registrations
  add column if not exists reference text,
  add column if not exists registration_type text not null default 'registo_inicial'
    check (registration_type in ('registo_inicial','transferencia')),
  add column if not exists previous_owner_id uuid
    references public.owners(id) on delete restrict;

create unique index if not exists registrations_reference_unique_idx
  on public.registrations(reference)
  where reference is not null;

create unique index if not exists registrations_one_open_process_per_vehicle_idx
  on public.registrations(vehicle_id)
  where vehicle_id is not null
    and status in ('pendente','em_validacao','correccao');

create unique index if not exists vehicles_chassis_unique_idx
  on public.vehicles(upper(chassis_number))
  where chassis_number is not null and trim(chassis_number) <> '';

create unique index if not exists vehicles_frame_unique_idx
  on public.vehicles(upper(frame_number))
  where frame_number is not null and trim(frame_number) <> '';

create unique index if not exists vehicles_engine_unique_idx
  on public.vehicles(upper(engine_number))
  where engine_number is not null and trim(engine_number) <> '';

create unique index if not exists vehicles_plate_unique_idx
  on public.vehicles(upper(plate_number))
  where plate_number is not null and trim(plate_number) <> '';

create table if not exists public.registration_numbering_counters (
  municipality_id uuid not null
    references public.municipalities(id) on delete cascade,
  year integer not null check (year between 2000 and 2100),
  current_value bigint not null default 0 check (current_value >= 0),
  updated_at timestamptz not null default now(),
  primary key (municipality_id, year)
);

grant select, insert, update on public.registration_numbering_counters
to authenticated, service_role;
revoke all on public.registration_numbering_counters from anon;
alter table public.registration_numbering_counters enable row level security;

drop policy if exists registration_numbering_select_admin
on public.registration_numbering_counters;

create policy registration_numbering_select_admin
on public.registration_numbering_counters
for select to authenticated
using (
  (select private.same_municipality(municipality_id))
  and (select private.current_role()) in ('super_admin','admin_municipal')
);

create or replace function private.can_operate_in_municipality(
  p_municipality_id uuid,
  p_permission text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select private.is_super_admin())
      then (select private.super_admin_has_assistance(p_municipality_id))
    else
      p_municipality_id = (select private.current_municipality_id())
      and (select private.authorize(p_permission))
  end;
$$;

revoke all on function private.can_operate_in_municipality(uuid,text) from public;
grant execute on function private.can_operate_in_municipality(uuid,text) to authenticated;

create or replace function private.next_registration_reference(
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

  insert into public.registration_numbering_counters(
    municipality_id, year, current_value
  )
  values (p_municipality_id, v_year, 1)
  on conflict (municipality_id, year)
  do update set
    current_value = public.registration_numbering_counters.current_value + 1,
    updated_at = now()
  returning current_value into v_value;

  return
    'REG-' ||
    upper(v_code) ||
    '-' ||
    v_year::text ||
    '-' ||
    lpad(v_value::text, 6, '0');
end;
$$;

revoke all on function private.next_registration_reference(uuid) from public;

create or replace function private.next_vehicle_mobigest_number(
  p_municipality_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_value bigint;
begin
  select code into v_code
  from public.municipalities
  where id = p_municipality_id;

  if v_code is null then
    raise exception 'Município não encontrado';
  end if;

  insert into public.numbering_counters(municipality_id, current_value)
  values (p_municipality_id, 1)
  on conflict (municipality_id)
  do update set
    current_value = public.numbering_counters.current_value + 1,
    updated_at = now()
  returning current_value into v_value;

  return 'MZ-' || upper(v_code) || '-' || lpad(v_value::text, 6, '0');
end;
$$;

revoke all on function private.next_vehicle_mobigest_number(uuid) from public;

create or replace function public.create_vehicle_registration(
  p_owner_id uuid,
  p_vehicle_type text,
  p_administrative_post_id uuid default null,
  p_locality_id uuid default null,
  p_plate_number text default null,
  p_chassis_number text default null,
  p_frame_number text default null,
  p_engine_number text default null,
  p_make text default null,
  p_model text default null,
  p_color text default null,
  p_manufacture_year integer default null,
  p_notes text default null
)
returns table (
  registration_id uuid,
  registration_reference text,
  vehicle_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_municipality uuid := (select private.current_operational_municipality_id());
  v_owner public.owners%rowtype;
  v_vehicle_id uuid;
  v_registration_id uuid;
  v_reference text;
begin
  if v_actor is null or v_municipality is null then
    raise exception 'Contexto municipal não disponível';
  end if;

  if not (select private.can_operate_in_municipality(v_municipality, 'vehicles.create'))
     or not (select private.can_operate_in_municipality(v_municipality, 'registrations.create')) then
    raise exception 'Sem permissão para iniciar um registo de veículo';
  end if;

  if p_vehicle_type not in ('motorizada','carro','bicicleta') then
    raise exception 'Tipo de veículo inválido';
  end if;

  if p_manufacture_year is not null
     and (p_manufacture_year < 1900 or p_manufacture_year > extract(year from now())::integer + 1) then
    raise exception 'Ano de fabrico inválido';
  end if;

  select * into v_owner
  from public.owners
  where id = p_owner_id;

  if v_owner.id is null
     or v_owner.municipality_id <> v_municipality then
    raise exception 'Proprietário não pertence ao município actual';
  end if;

  if v_owner.status <> 'activo' then
    raise exception 'O proprietário precisa estar activo para iniciar um registo';
  end if;

  insert into public.vehicles (
    municipality_id,
    administrative_post_id,
    locality_id,
    current_owner_id,
    vehicle_type,
    plate_number,
    chassis_number,
    frame_number,
    engine_number,
    make,
    model,
    color,
    manufacture_year,
    commercial_status,
    status,
    notes,
    created_by,
    updated_by
  )
  values (
    v_municipality,
    p_administrative_post_id,
    p_locality_id,
    p_owner_id,
    p_vehicle_type,
    nullif(upper(trim(p_plate_number)), ''),
    nullif(upper(trim(p_chassis_number)), ''),
    nullif(upper(trim(p_frame_number)), ''),
    nullif(upper(trim(p_engine_number)), ''),
    nullif(trim(p_make), ''),
    nullif(trim(p_model), ''),
    nullif(trim(p_color), ''),
    p_manufacture_year,
    'normal',
    'activa',
    nullif(trim(p_notes), ''),
    v_actor,
    v_actor
  )
  returning id into v_vehicle_id;

  v_reference := private.next_registration_reference(v_municipality);

  insert into public.registrations (
    municipality_id,
    owner_id,
    vehicle_id,
    reference,
    registration_type,
    status,
    submitted_at,
    created_by
  )
  values (
    v_municipality,
    p_owner_id,
    v_vehicle_id,
    v_reference,
    'registo_inicial',
    'pendente',
    now(),
    v_actor
  )
  returning id into v_registration_id;

  insert into public.audit_logs (
    actor_user_id, actor_role, municipality_id, module, action,
    entity_type, entity_id, result, reference, new_values, observation, origin
  )
  values (
    v_actor,
    (select private.current_role()),
    v_municipality,
    'registrations',
    'create',
    'registration',
    v_registration_id,
    'success',
    v_reference,
    jsonb_build_object(
      'registration_type', 'registo_inicial',
      'owner_id', p_owner_id,
      'vehicle_id', v_vehicle_id,
      'vehicle_type', p_vehicle_type,
      'status', 'pendente'
    ),
    'Processo de registo de veículo submetido',
    'web'
  );

  return query
  select v_registration_id, v_reference, v_vehicle_id;
exception
  when unique_violation then
    raise exception 'Já existe um veículo/processo com um dos identificadores informados';
end;
$$;

create or replace function public.update_vehicle_core(
  p_vehicle_id uuid,
  p_administrative_post_id uuid default null,
  p_locality_id uuid default null,
  p_plate_number text default null,
  p_chassis_number text default null,
  p_frame_number text default null,
  p_engine_number text default null,
  p_make text default null,
  p_model text default null,
  p_color text default null,
  p_manufacture_year integer default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_old public.vehicles%rowtype;
  v_new public.vehicles%rowtype;
begin
  select * into v_old
  from public.vehicles
  where id = p_vehicle_id
  for update;

  if v_old.id is null then
    raise exception 'Veículo não encontrado';
  end if;

  if not (select private.can_operate_in_municipality(v_old.municipality_id, 'vehicles.update')) then
    raise exception 'Sem permissão para editar este veículo';
  end if;

  if p_manufacture_year is not null
     and (p_manufacture_year < 1900 or p_manufacture_year > extract(year from now())::integer + 1) then
    raise exception 'Ano de fabrico inválido';
  end if;

  update public.vehicles
  set
    administrative_post_id = p_administrative_post_id,
    locality_id = p_locality_id,
    plate_number = nullif(upper(trim(p_plate_number)), ''),
    chassis_number = nullif(upper(trim(p_chassis_number)), ''),
    frame_number = nullif(upper(trim(p_frame_number)), ''),
    engine_number = nullif(upper(trim(p_engine_number)), ''),
    make = nullif(trim(p_make), ''),
    model = nullif(trim(p_model), ''),
    color = nullif(trim(p_color), ''),
    manufacture_year = p_manufacture_year,
    notes = nullif(trim(p_notes), ''),
    updated_by = v_actor
  where id = p_vehicle_id
  returning * into v_new;

  insert into public.audit_logs (
    actor_user_id, actor_role, municipality_id, module, action,
    entity_type, entity_id, result, reference, old_values, new_values,
    observation, origin
  )
  values (
    v_actor,
    (select private.current_role()),
    v_old.municipality_id,
    'vehicles',
    'update',
    'vehicle',
    p_vehicle_id,
    'success',
    coalesce(v_new.mobigest_number, p_vehicle_id::text),
    to_jsonb(v_old),
    to_jsonb(v_new),
    'Dados principais do veículo actualizados',
    'web'
  );
exception
  when unique_violation then
    raise exception 'Já existe outro veículo com um dos identificadores informados';
end;
$$;

create or replace function public.set_vehicle_operational_status(
  p_vehicle_id uuid,
  p_status text,
  p_reason text,
  p_occurrence_reference text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_vehicle public.vehicles%rowtype;
begin
  if p_status not in ('activa','suspensa','roubada','apreendida','cancelada') then
    raise exception 'Estado do veículo inválido';
  end if;

  if nullif(trim(p_reason), '') is null then
    raise exception 'Motivo da alteração de estado é obrigatório';
  end if;

  select * into v_vehicle
  from public.vehicles
  where id = p_vehicle_id
  for update;

  if v_vehicle.id is null then
    raise exception 'Veículo não encontrado';
  end if;

  if not (select private.can_operate_in_municipality(v_vehicle.municipality_id, 'vehicles.status')) then
    raise exception 'Sem permissão para alterar o estado deste veículo';
  end if;

  if v_vehicle.status = p_status then
    raise exception 'O veículo já se encontra neste estado';
  end if;

  if v_vehicle.status = 'cancelada' then
    raise exception 'Um veículo cancelado não pode mudar directamente para outro estado';
  end if;

  if v_vehicle.status = 'activa'
     and p_status not in ('suspensa','roubada','apreendida','cancelada') then
    raise exception 'Transição de estado não autorizada';
  end if;

  if v_vehicle.status in ('suspensa','roubada','apreendida')
     and p_status not in ('activa','cancelada') then
    raise exception 'Transição de estado não autorizada';
  end if;

  update public.vehicles
  set status = p_status,
      updated_by = v_actor
  where id = p_vehicle_id;

  insert into public.vehicle_status_history (
    vehicle_id,
    previous_status,
    new_status,
    reason,
    occurrence_reference,
    changed_by
  )
  values (
    p_vehicle_id,
    v_vehicle.status,
    p_status,
    trim(p_reason),
    nullif(trim(p_occurrence_reference), ''),
    v_actor
  );

  insert into public.audit_logs (
    actor_user_id, actor_role, municipality_id, module, action,
    entity_type, entity_id, result, reference, old_values, new_values,
    observation, origin
  )
  values (
    v_actor,
    (select private.current_role()),
    v_vehicle.municipality_id,
    'vehicles',
    'change_status',
    'vehicle',
    p_vehicle_id,
    'success',
    coalesce(v_vehicle.mobigest_number, p_vehicle_id::text),
    jsonb_build_object('status', v_vehicle.status),
    jsonb_build_object('status', p_status),
    trim(p_reason),
    'web'
  );
end;
$$;

create or replace function public.set_vehicle_commercial_status(
  p_vehicle_id uuid,
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
  v_vehicle public.vehicles%rowtype;
begin
  if p_status not in ('normal','a_venda') then
    raise exception 'Estado comercial inválido';
  end if;

  if nullif(trim(p_reason), '') is null then
    raise exception 'Motivo da alteração é obrigatório';
  end if;

  select * into v_vehicle
  from public.vehicles
  where id = p_vehicle_id
  for update;

  if v_vehicle.id is null then
    raise exception 'Veículo não encontrado';
  end if;

  if not (select private.can_operate_in_municipality(v_vehicle.municipality_id, 'vehicles.update')) then
    raise exception 'Sem permissão para alterar este veículo';
  end if;

  if v_vehicle.commercial_status = p_status then
    raise exception 'O veículo já possui este estado comercial';
  end if;

  if p_status = 'a_venda'
     and v_vehicle.status <> 'activa' then
    raise exception 'Apenas veículos activos podem ser marcados como à venda';
  end if;

  update public.vehicles
  set commercial_status = p_status,
      updated_by = v_actor
  where id = p_vehicle_id;

  insert into public.audit_logs (
    actor_user_id, actor_role, municipality_id, module, action,
    entity_type, entity_id, result, reference, old_values, new_values,
    observation, origin
  )
  values (
    v_actor,
    (select private.current_role()),
    v_vehicle.municipality_id,
    'vehicles',
    'change_commercial_status',
    'vehicle',
    p_vehicle_id,
    'success',
    coalesce(v_vehicle.mobigest_number, p_vehicle_id::text),
    jsonb_build_object('commercial_status', v_vehicle.commercial_status),
    jsonb_build_object('commercial_status', p_status),
    trim(p_reason),
    'web'
  );
end;
$$;

create or replace function public.request_vehicle_transfer(
  p_vehicle_id uuid,
  p_new_owner_id uuid,
  p_reason text
)
returns table (
  registration_id uuid,
  registration_reference text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_vehicle public.vehicles%rowtype;
  v_new_owner public.owners%rowtype;
  v_registration_id uuid;
  v_reference text;
begin
  if nullif(trim(p_reason), '') is null then
    raise exception 'Motivo da transferência é obrigatório';
  end if;

  select * into v_vehicle
  from public.vehicles
  where id = p_vehicle_id
  for update;

  if v_vehicle.id is null then
    raise exception 'Veículo não encontrado';
  end if;

  if not (select private.can_operate_in_municipality(v_vehicle.municipality_id, 'ownership.transfer')) then
    raise exception 'Sem permissão para iniciar transferência';
  end if;

  if v_vehicle.current_owner_id is null then
    raise exception 'Veículo sem proprietário actual';
  end if;

  if v_vehicle.status <> 'activa' then
    raise exception 'A transferência só pode ser iniciada para um veículo activo';
  end if;

  if v_vehicle.current_owner_id = p_new_owner_id then
    raise exception 'O novo proprietário já é o proprietário actual';
  end if;

  select * into v_new_owner
  from public.owners
  where id = p_new_owner_id;

  if v_new_owner.id is null
     or v_new_owner.municipality_id <> v_vehicle.municipality_id
     or v_new_owner.status <> 'activo' then
    raise exception 'Novo proprietário inválido para este município';
  end if;

  if exists (
    select 1
    from public.registrations r
    where r.vehicle_id = p_vehicle_id
      and r.status in ('pendente','em_validacao','correccao')
  ) then
    raise exception 'Já existe um processo aberto para este veículo';
  end if;

  v_reference := private.next_registration_reference(v_vehicle.municipality_id);

  insert into public.registrations (
    municipality_id,
    owner_id,
    previous_owner_id,
    vehicle_id,
    reference,
    registration_type,
    status,
    submitted_at,
    decision_observation,
    created_by
  )
  values (
    v_vehicle.municipality_id,
    p_new_owner_id,
    v_vehicle.current_owner_id,
    p_vehicle_id,
    v_reference,
    'transferencia',
    'pendente',
    now(),
    trim(p_reason),
    v_actor
  )
  returning id into v_registration_id;

  insert into public.audit_logs (
    actor_user_id, actor_role, municipality_id, module, action,
    entity_type, entity_id, result, reference, new_values, observation, origin
  )
  values (
    v_actor,
    (select private.current_role()),
    v_vehicle.municipality_id,
    'ownership',
    'request_transfer',
    'registration',
    v_registration_id,
    'success',
    v_reference,
    jsonb_build_object(
      'vehicle_id', p_vehicle_id,
      'previous_owner_id', v_vehicle.current_owner_id,
      'new_owner_id', p_new_owner_id,
      'status', 'pendente'
    ),
    trim(p_reason),
    'web'
  );

  return query select v_registration_id, v_reference;
end;
$$;

create or replace function public.decide_registration(
  p_registration_id uuid,
  p_decision text,
  p_observation text default null
)
returns table (
  registration_status text,
  vehicle_mobigest_number text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_registration public.registrations%rowtype;
  v_vehicle public.vehicles%rowtype;
  v_mobigest_number text;
  v_missing_documents integer;
begin
  if p_decision not in ('aprovada','correccao','rejeitada') then
    raise exception 'Decisão de registo inválida';
  end if;

  select * into v_registration
  from public.registrations
  where id = p_registration_id
  for update;

  if v_registration.id is null then
    raise exception 'Processo de registo não encontrado';
  end if;

  if not (select private.can_operate_in_municipality(v_registration.municipality_id, 'registrations.validate')) then
    raise exception 'Sem permissão para decidir este processo';
  end if;

  if v_registration.status not in ('pendente','em_validacao') then
    if v_registration.status = 'correccao' then
      raise exception 'O processo está em correcção e deve ser reenviado antes de nova decisão';
    end if;
    raise exception 'Este processo já possui uma decisão final';
  end if;

  select * into v_vehicle
  from public.vehicles
  where id = v_registration.vehicle_id
  for update;

  if v_vehicle.id is null then
    raise exception 'Veículo do processo não encontrado';
  end if;

  if p_decision = 'aprovada' then
    select count(*) into v_missing_documents
    from public.document_requirements dr
    where dr.municipality_id = v_registration.municipality_id
      and dr.active
      and dr.required
      and (dr.vehicle_type is null or dr.vehicle_type = v_vehicle.vehicle_type)
      and not exists (
        select 1
        from public.documents d
        where d.registration_id = v_registration.id
          and d.document_type = dr.document_code
          and d.status = 'validado'
      );

    if v_missing_documents > 0 then
      raise exception 'Existem documentos obrigatórios ainda não validados';
    end if;

    if v_registration.registration_type = 'transferencia' then
      if v_vehicle.current_owner_id is distinct from v_registration.previous_owner_id then
        raise exception 'A propriedade actual mudou desde o início da transferência';
      end if;

      update public.vehicles
      set current_owner_id = v_registration.owner_id,
          updated_by = v_actor
      where id = v_vehicle.id;

      insert into public.ownership_history (
        vehicle_id,
        previous_owner_id,
        new_owner_id,
        registration_id,
        operation,
        reason,
        effective_at,
        created_by
      )
      values (
        v_vehicle.id,
        v_registration.previous_owner_id,
        v_registration.owner_id,
        v_registration.id,
        'transferencia',
        nullif(trim(p_observation), ''),
        now(),
        v_actor
      );
    else
      if v_vehicle.mobigest_number is null then
        v_mobigest_number := private.next_vehicle_mobigest_number(v_registration.municipality_id);

        update public.vehicles
        set
          mobigest_number = v_mobigest_number,
          registration_date = current_date,
          updated_by = v_actor
        where id = v_vehicle.id;
      else
        v_mobigest_number := v_vehicle.mobigest_number;
      end if;

      if not exists (
        select 1
        from public.ownership_history oh
        where oh.vehicle_id = v_vehicle.id
          and oh.operation = 'registo_inicial'
      ) then
        insert into public.ownership_history (
          vehicle_id,
          previous_owner_id,
          new_owner_id,
          registration_id,
          operation,
          reason,
          effective_at,
          created_by
        )
        values (
          v_vehicle.id,
          null,
          v_registration.owner_id,
          v_registration.id,
          'registo_inicial',
          'Registo inicial aprovado',
          now(),
          v_actor
        );
      end if;
    end if;

    update public.registrations
    set
      status = 'aprovada',
      validated_at = now(),
      approved_at = now(),
      rejected_at = null,
      correction_requested_at = null,
      decision_observation = nullif(trim(p_observation), ''),
      validated_by = v_actor
    where id = v_registration.id;
  elsif p_decision = 'correccao' then
    if nullif(trim(p_observation), '') is null then
      raise exception 'Indique o que deve ser corrigido';
    end if;

    update public.registrations
    set
      status = 'correccao',
      validated_at = now(),
      correction_requested_at = now(),
      decision_observation = trim(p_observation),
      validated_by = v_actor
    where id = v_registration.id;
  else
    if nullif(trim(p_observation), '') is null then
      raise exception 'Indique o motivo da rejeição';
    end if;

    update public.registrations
    set
      status = 'rejeitada',
      validated_at = now(),
      rejected_at = now(),
      decision_observation = trim(p_observation),
      validated_by = v_actor
    where id = v_registration.id;

    if v_registration.registration_type = 'registo_inicial' then
      update public.vehicles
      set status = 'cancelada',
          updated_by = v_actor
      where id = v_vehicle.id;

      insert into public.vehicle_status_history (
        vehicle_id,
        previous_status,
        new_status,
        reason,
        occurrence_reference,
        changed_by
      )
      values (
        v_vehicle.id,
        v_vehicle.status,
        'cancelada',
        'Registo inicial rejeitado: ' || trim(p_observation),
        v_registration.reference,
        v_actor
      );
    end if;
  end if;

  insert into public.registration_decisions (
    registration_id,
    decision,
    observation,
    decided_by
  )
  values (
    v_registration.id,
    p_decision,
    nullif(trim(p_observation), ''),
    v_actor
  );

  insert into public.audit_logs (
    actor_user_id, actor_role, municipality_id, module, action,
    entity_type, entity_id, result, reference, old_values, new_values,
    observation, origin
  )
  values (
    v_actor,
    (select private.current_role()),
    v_registration.municipality_id,
    'registrations',
    'decide',
    'registration',
    v_registration.id,
    'success',
    v_registration.reference,
    jsonb_build_object('status', v_registration.status),
    jsonb_build_object('status', p_decision),
    nullif(trim(p_observation), ''),
    'web'
  );

  select mobigest_number into v_mobigest_number
  from public.vehicles
  where id = v_registration.vehicle_id;

  return query
  select p_decision, v_mobigest_number;
end;
$$;

create or replace function public.resubmit_registration(
  p_registration_id uuid,
  p_observation text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_registration public.registrations%rowtype;
begin
  select * into v_registration
  from public.registrations
  where id = p_registration_id
  for update;

  if v_registration.id is null then
    raise exception 'Processo não encontrado';
  end if;

  if v_registration.status <> 'correccao' then
    raise exception 'Apenas processos em correcção podem ser reenviados';
  end if;

  if not (select private.can_operate_in_municipality(v_registration.municipality_id, 'registrations.update')) then
    raise exception 'Sem permissão para reenviar este processo';
  end if;

  update public.registrations
  set
    status = 'pendente',
    submitted_at = now(),
    correction_requested_at = null,
    decision_observation = nullif(trim(p_observation), '')
  where id = p_registration_id;

  insert into public.audit_logs (
    actor_user_id, actor_role, municipality_id, module, action,
    entity_type, entity_id, result, reference, old_values, new_values,
    observation, origin
  )
  values (
    v_actor,
    (select private.current_role()),
    v_registration.municipality_id,
    'registrations',
    'resubmit',
    'registration',
    p_registration_id,
    'success',
    v_registration.reference,
    jsonb_build_object('status', 'correccao'),
    jsonb_build_object('status', 'pendente'),
    nullif(trim(p_observation), ''),
    'web'
  );
end;
$$;

revoke all on function public.create_vehicle_registration(uuid,text,uuid,uuid,text,text,text,text,text,text,text,integer,text) from public;
revoke all on function public.update_vehicle_core(uuid,uuid,uuid,text,text,text,text,text,text,text,integer,text) from public;
revoke all on function public.set_vehicle_operational_status(uuid,text,text,text) from public;
revoke all on function public.set_vehicle_commercial_status(uuid,text,text) from public;
revoke all on function public.request_vehicle_transfer(uuid,uuid,text) from public;
revoke all on function public.decide_registration(uuid,text,text) from public;
revoke all on function public.resubmit_registration(uuid,text) from public;

grant execute on function public.create_vehicle_registration(uuid,text,uuid,uuid,text,text,text,text,text,text,text,integer,text) to authenticated;
grant execute on function public.update_vehicle_core(uuid,uuid,uuid,text,text,text,text,text,text,text,integer,text) to authenticated;
grant execute on function public.set_vehicle_operational_status(uuid,text,text,text) to authenticated;
grant execute on function public.set_vehicle_commercial_status(uuid,text,text) to authenticated;
grant execute on function public.request_vehicle_transfer(uuid,uuid,text) to authenticated;
grant execute on function public.decide_registration(uuid,text,text) to authenticated;
grant execute on function public.resubmit_registration(uuid,text) to authenticated;

-- Históricos e processos passam a ser mutados apenas pelas funções controladas.
revoke insert, update, delete on public.vehicles from authenticated;
revoke insert, update, delete on public.registrations from authenticated;
revoke insert, update, delete on public.registration_decisions from authenticated;
revoke insert, update, delete on public.vehicle_status_history from authenticated;
revoke insert, update, delete on public.ownership_history from authenticated;
revoke insert, update on public.numbering_counters from authenticated;
revoke insert, update on public.registration_numbering_counters from authenticated;

grant select on public.vehicles,
  public.registrations,
  public.registration_decisions,
  public.vehicle_status_history,
  public.ownership_history,
  public.numbering_counters,
  public.registration_numbering_counters
to authenticated;
