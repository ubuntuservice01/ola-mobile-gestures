-- MobiGest — fiscalização, evidências e multas transaccionais

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'mobigest-evidence',
  'mobigest-evidence',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "mobigest_evidence_select" on storage.objects;
create policy "mobigest_evidence_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'mobigest-evidence'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (select private.same_municipality(split_part(name, '/', 1)::uuid))
  and (select private.authorize('fiscalization.view'))
);

drop policy if exists "mobigest_evidence_insert" on storage.objects;
create policy "mobigest_evidence_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'mobigest-evidence'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (select private.can_operate_in_municipality(
    split_part(name, '/', 1)::uuid,
    'fiscalization.create'
  ))
);

drop policy if exists "mobigest_evidence_delete" on storage.objects;
create policy "mobigest_evidence_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'mobigest-evidence'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (select private.can_operate_in_municipality(
    split_part(name, '/', 1)::uuid,
    'fiscalization.create'
  ))
);

create or replace function public.create_fiscalization(
  p_vehicle_id uuid,
  p_result text,
  p_occurrence text default null,
  p_observation text default null,
  p_administrative_post_id uuid default null,
  p_locality_id uuid default null,
  p_occurred_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_vehicle public.vehicles%rowtype;
  v_id uuid;
begin
  if p_result not in ('regular','irregular','pendente','nao_localizado','outro') then
    raise exception 'Resultado da fiscalização inválido';
  end if;

  select * into v_vehicle
  from public.vehicles
  where id = p_vehicle_id;

  if v_vehicle.id is null then
    raise exception 'Veículo não encontrado';
  end if;

  if not (select private.can_operate_in_municipality(
    v_vehicle.municipality_id,
    'fiscalization.create'
  )) then
    raise exception 'Sem permissão para registar fiscalização';
  end if;

  insert into public.fiscalizations (
    municipality_id,
    vehicle_id,
    administrative_post_id,
    locality_id,
    result,
    occurrence,
    observation,
    evidence_count,
    fiscal_id,
    occurred_at
  )
  values (
    v_vehicle.municipality_id,
    p_vehicle_id,
    p_administrative_post_id,
    p_locality_id,
    p_result,
    nullif(trim(p_occurrence), ''),
    nullif(trim(p_observation), ''),
    0,
    v_actor,
    coalesce(p_occurred_at, now())
  )
  returning id into v_id;

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
    v_vehicle.municipality_id,
    'fiscalization',
    'create',
    'fiscalization',
    v_id,
    'success',
    coalesce(v_vehicle.mobigest_number, p_vehicle_id::text),
    jsonb_build_object(
      'vehicle_id', p_vehicle_id,
      'result', p_result,
      'administrative_post_id', p_administrative_post_id,
      'locality_id', p_locality_id,
      'occurred_at', coalesce(p_occurred_at, now())
    ),
    nullif(trim(p_observation), ''),
    'web'
  );

  return v_id;
end;
$$;

create or replace function public.add_fiscalization_evidence(
  p_fiscalization_id uuid,
  p_file_path text,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_fiscalization public.fiscalizations%rowtype;
  v_expected_prefix text;
  v_id uuid;
begin
  select * into v_fiscalization
  from public.fiscalizations
  where id = p_fiscalization_id
  for update;

  if v_fiscalization.id is null then
    raise exception 'Fiscalização não encontrada';
  end if;

  if not (select private.can_operate_in_municipality(
    v_fiscalization.municipality_id,
    'fiscalization.create'
  )) then
    raise exception 'Sem permissão para adicionar evidência';
  end if;

  v_expected_prefix :=
    v_fiscalization.municipality_id::text ||
    '/fiscalization/' ||
    p_fiscalization_id::text ||
    '/';

  if p_file_path is null
     or position(v_expected_prefix in p_file_path) <> 1 then
    raise exception 'Caminho de evidência inválido';
  end if;

  if not exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'mobigest-evidence'
      and o.name = p_file_path
  ) then
    raise exception 'Ficheiro de evidência não encontrado';
  end if;

  insert into public.fiscalization_evidence (
    fiscalization_id,
    file_path,
    description,
    created_by
  )
  values (
    p_fiscalization_id,
    p_file_path,
    nullif(trim(p_description), ''),
    v_actor
  )
  returning id into v_id;

  update public.fiscalizations
  set evidence_count = evidence_count + 1
  where id = p_fiscalization_id;

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
    v_fiscalization.municipality_id,
    'fiscalization',
    'add_evidence',
    'fiscalization_evidence',
    v_id,
    'success',
    v_fiscalization.id::text,
    jsonb_build_object('file_path', p_file_path),
    nullif(trim(p_description), ''),
    'web'
  );

  return v_id;
end;
$$;

create or replace function public.create_fine_type(
  p_code text,
  p_name text,
  p_description text,
  p_amount numeric,
  p_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_municipality uuid := (select private.current_operational_municipality_id());
  v_id uuid;
begin
  if v_municipality is null then
    raise exception 'Contexto municipal não disponível';
  end if;

  if not (select private.can_operate_in_municipality(
    v_municipality,
    'fine_types.manage'
  )) then
    raise exception 'Sem permissão para gerir tipos de multa';
  end if;

  if nullif(trim(p_code), '') is null
     or nullif(trim(p_name), '') is null
     or p_amount is null
     or p_amount < 0 then
    raise exception 'Dados do tipo de multa inválidos';
  end if;

  insert into public.fine_types (
    municipality_id,
    code,
    name,
    description,
    amount,
    active,
    created_by,
    updated_by
  )
  values (
    v_municipality,
    upper(trim(p_code)),
    trim(p_name),
    nullif(trim(p_description), ''),
    p_amount,
    p_active,
    v_actor,
    v_actor
  )
  returning id into v_id;

  insert into public.audit_logs (
    actor_user_id, actor_role, municipality_id, module, action,
    entity_type, entity_id, result, reference, new_values, observation, origin
  )
  values (
    v_actor,
    (select private.current_role()),
    v_municipality,
    'fines',
    'create_type',
    'fine_type',
    v_id,
    'success',
    upper(trim(p_code)),
    jsonb_build_object(
      'name', trim(p_name),
      'amount', p_amount,
      'active', p_active
    ),
    nullif(trim(p_description), ''),
    'web'
  );

  return v_id;
exception
  when unique_violation then
    raise exception 'Já existe um tipo de multa com este código';
end;
$$;

create or replace function public.update_fine_type(
  p_id uuid,
  p_code text,
  p_name text,
  p_description text,
  p_amount numeric,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_old public.fine_types%rowtype;
  v_new public.fine_types%rowtype;
begin
  select * into v_old
  from public.fine_types
  where id = p_id
  for update;

  if v_old.id is null then
    raise exception 'Tipo de multa não encontrado';
  end if;

  if not (select private.can_operate_in_municipality(
    v_old.municipality_id,
    'fine_types.manage'
  )) then
    raise exception 'Sem permissão para alterar este tipo de multa';
  end if;

  if nullif(trim(p_code), '') is null
     or nullif(trim(p_name), '') is null
     or p_amount is null
     or p_amount < 0 then
    raise exception 'Dados do tipo de multa inválidos';
  end if;

  update public.fine_types
  set
    code = upper(trim(p_code)),
    name = trim(p_name),
    description = nullif(trim(p_description), ''),
    amount = p_amount,
    active = p_active,
    updated_by = v_actor
  where id = p_id
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
    'fines',
    'update_type',
    'fine_type',
    p_id,
    'success',
    v_new.code,
    to_jsonb(v_old),
    to_jsonb(v_new),
    'Tipo de multa actualizado',
    'web'
  );
exception
  when unique_violation then
    raise exception 'Já existe um tipo de multa com este código';
end;
$$;

create or replace function public.issue_fine(
  p_driver_id uuid,
  p_fine_type_id uuid,
  p_vehicle_id uuid default null,
  p_location text default null,
  p_observation text default null,
  p_occurred_at timestamptz default now()
)
returns table (
  fine_id uuid,
  fine_reference text,
  charge_id uuid,
  amount numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_driver public.drivers%rowtype;
  v_type public.fine_types%rowtype;
  v_vehicle public.vehicles%rowtype;
  v_reference text;
  v_charge_id uuid;
  v_fine_id uuid;
  v_owner_id uuid;
begin
  select * into v_driver
  from public.drivers
  where id = p_driver_id;

  if v_driver.id is null then
    raise exception 'Condutor/taxista não encontrado';
  end if;

  if not (select private.can_operate_in_municipality(
    v_driver.municipality_id,
    'fines.create'
  )) then
    raise exception 'Sem permissão para emitir multa';
  end if;

  select * into v_type
  from public.fine_types
  where id = p_fine_type_id
    and municipality_id = v_driver.municipality_id;

  if v_type.id is null or not v_type.active then
    raise exception 'Tipo de multa inválido ou inactivo';
  end if;

  if p_vehicle_id is not null then
    select * into v_vehicle
    from public.vehicles
    where id = p_vehicle_id
      and municipality_id = v_driver.municipality_id;

    if v_vehicle.id is null then
      raise exception 'Veículo inválido para esta multa';
    end if;

    v_owner_id := v_vehicle.current_owner_id;
  end if;

  v_reference := public.next_fine_reference(v_driver.municipality_id);

  insert into public.charges (
    municipality_id,
    owner_id,
    service_type,
    amount,
    currency,
    status,
    exemption,
    created_by
  )
  values (
    v_driver.municipality_id,
    v_owner_id,
    'multa:' || v_type.code,
    v_type.amount,
    'MZN',
    'pendente',
    false,
    v_actor
  )
  returning id into v_charge_id;

  insert into public.fines (
    municipality_id,
    reference,
    driver_id,
    vehicle_id,
    fine_type_id,
    fiscal_id,
    charge_id,
    applied_amount,
    location,
    observation,
    occurred_at,
    status
  )
  values (
    v_driver.municipality_id,
    v_reference,
    v_driver.id,
    p_vehicle_id,
    v_type.id,
    v_actor,
    v_charge_id,
    v_type.amount,
    nullif(trim(p_location), ''),
    nullif(trim(p_observation), ''),
    coalesce(p_occurred_at, now()),
    'pendente'
  )
  returning id into v_fine_id;

  insert into public.audit_logs (
    actor_user_id, actor_role, municipality_id, module, action,
    entity_type, entity_id, result, reference, new_values, observation, origin
  )
  values (
    v_actor,
    (select private.current_role()),
    v_driver.municipality_id,
    'fines',
    'issue',
    'fine',
    v_fine_id,
    'success',
    v_reference,
    jsonb_build_object(
      'driver_id', v_driver.id,
      'vehicle_id', p_vehicle_id,
      'fine_type_id', v_type.id,
      'charge_id', v_charge_id,
      'amount', v_type.amount,
      'status', 'pendente'
    ),
    nullif(trim(p_observation), ''),
    'web'
  );

  return query
  select v_fine_id, v_reference, v_charge_id, v_type.amount;
end;
$$;

create or replace function public.set_fine_case_status(
  p_fine_id uuid,
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
  v_old public.fines%rowtype;
begin
  if p_status not in ('pendente','anulada','em_recurso') then
    raise exception 'Estado administrativo da multa inválido';
  end if;

  if nullif(trim(p_reason), '') is null then
    raise exception 'Motivo da alteração é obrigatório';
  end if;

  select * into v_old
  from public.fines
  where id = p_fine_id
  for update;

  if v_old.id is null then
    raise exception 'Multa não encontrada';
  end if;

  if not (
    (select private.is_super_admin())
    and (select private.super_admin_has_assistance(v_old.municipality_id))
    or (
      (select private.current_role()) = 'admin_municipal'
      and v_old.municipality_id = (select private.current_municipality_id())
      and (select private.authorize('fine_types.manage'))
    )
  ) then
    raise exception 'Sem permissão para alterar o estado administrativo da multa';
  end if;

  if v_old.status = 'paga' then
    raise exception 'Uma multa paga não pode ser alterada por este fluxo';
  end if;

  if v_old.status = p_status then
    raise exception 'A multa já possui este estado';
  end if;

  update public.fines
  set status = p_status
  where id = p_fine_id;

  if p_status = 'anulada' and v_old.charge_id is not null then
    update public.charges
    set status = 'cancelado'
    where id = v_old.charge_id
      and status in ('pendente','em_confirmacao');
  elsif p_status = 'pendente' and v_old.charge_id is not null then
    update public.charges
    set status = 'pendente'
    where id = v_old.charge_id
      and status = 'cancelado';
  end if;

  insert into public.audit_logs (
    actor_user_id, actor_role, municipality_id, module, action,
    entity_type, entity_id, result, reference, old_values, new_values,
    observation, origin
  )
  values (
    v_actor,
    (select private.current_role()),
    v_old.municipality_id,
    'fines',
    'change_status',
    'fine',
    v_old.id,
    'success',
    v_old.reference,
    jsonb_build_object('status', v_old.status),
    jsonb_build_object('status', p_status),
    trim(p_reason),
    'web'
  );
end;
$$;

revoke all on function public.create_fiscalization(uuid,text,text,text,uuid,uuid,timestamptz) from public;
revoke all on function public.add_fiscalization_evidence(uuid,text,text) from public;
revoke all on function public.create_fine_type(text,text,text,numeric,boolean) from public;
revoke all on function public.update_fine_type(uuid,text,text,text,numeric,boolean) from public;
revoke all on function public.issue_fine(uuid,uuid,uuid,text,text,timestamptz) from public;
revoke all on function public.set_fine_case_status(uuid,text,text) from public;

grant execute on function public.create_fiscalization(uuid,text,text,text,uuid,uuid,timestamptz) to authenticated;
grant execute on function public.add_fiscalization_evidence(uuid,text,text) to authenticated;
grant execute on function public.create_fine_type(text,text,text,numeric,boolean) to authenticated;
grant execute on function public.update_fine_type(uuid,text,text,text,numeric,boolean) to authenticated;
grant execute on function public.issue_fine(uuid,uuid,uuid,text,text,timestamptz) to authenticated;
grant execute on function public.set_fine_case_status(uuid,text,text) to authenticated;

revoke insert, update, delete on public.fiscalizations from authenticated;
revoke insert, update, delete on public.fiscalization_evidence from authenticated;
revoke insert, update, delete on public.fine_types from authenticated;
revoke insert, update, delete on public.fines from authenticated;

grant select on public.fiscalizations,
  public.fiscalization_evidence,
  public.fine_types,
  public.fines
to authenticated;
