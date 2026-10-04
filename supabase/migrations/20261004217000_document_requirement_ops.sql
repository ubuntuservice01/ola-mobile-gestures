-- MobiGest — gestão auditada de requisitos documentais municipais

create or replace function public.create_document_requirement(
  p_vehicle_type text,
  p_document_code text,
  p_label text,
  p_required boolean default true,
  p_expiry_required boolean default false,
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
  if v_actor is null or v_municipality is null then
    raise exception 'Contexto municipal não disponível';
  end if;

  if not (select private.can_operate_in_municipality(
    v_municipality,
    'settings.manage'
  )) then
    raise exception 'Sem permissão para gerir requisitos documentais';
  end if;

  if p_vehicle_type is not null
     and p_vehicle_type not in ('motorizada','carro','bicicleta') then
    raise exception 'Tipo de veículo inválido';
  end if;

  if nullif(trim(p_document_code), '') is null
     or nullif(trim(p_label), '') is null then
    raise exception 'Código e designação do documento são obrigatórios';
  end if;

  insert into public.document_requirements (
    municipality_id,
    vehicle_type,
    document_code,
    label,
    required,
    expiry_required,
    active
  )
  values (
    v_municipality,
    p_vehicle_type,
    lower(trim(p_document_code)),
    trim(p_label),
    p_required,
    p_expiry_required,
    p_active
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
    v_municipality,
    'documents',
    'create_requirement',
    'document_requirement',
    v_id,
    'success',
    lower(trim(p_document_code)),
    jsonb_build_object(
      'vehicle_type', p_vehicle_type,
      'document_code', lower(trim(p_document_code)),
      'label', trim(p_label),
      'required', p_required,
      'expiry_required', p_expiry_required,
      'active', p_active
    ),
    'Requisito documental municipal criado',
    'web'
  );

  return v_id;
exception
  when unique_violation then
    raise exception 'Já existe um requisito com este código e tipo de veículo';
end;
$$;

create or replace function public.update_document_requirement(
  p_id uuid,
  p_vehicle_type text,
  p_document_code text,
  p_label text,
  p_required boolean default true,
  p_expiry_required boolean default false,
  p_active boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_old public.document_requirements%rowtype;
  v_new public.document_requirements%rowtype;
begin
  select * into v_old
  from public.document_requirements
  where id = p_id
  for update;

  if v_old.id is null then
    raise exception 'Requisito documental não encontrado';
  end if;

  if not (select private.can_operate_in_municipality(
    v_old.municipality_id,
    'settings.manage'
  )) then
    raise exception 'Sem permissão para alterar este requisito';
  end if;

  if p_vehicle_type is not null
     and p_vehicle_type not in ('motorizada','carro','bicicleta') then
    raise exception 'Tipo de veículo inválido';
  end if;

  if nullif(trim(p_document_code), '') is null
     or nullif(trim(p_label), '') is null then
    raise exception 'Código e designação do documento são obrigatórios';
  end if;

  update public.document_requirements
  set
    vehicle_type = p_vehicle_type,
    document_code = lower(trim(p_document_code)),
    label = trim(p_label),
    required = p_required,
    expiry_required = p_expiry_required,
    active = p_active,
    updated_at = now()
  where id = p_id
  returning * into v_new;

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
    'documents',
    'update_requirement',
    'document_requirement',
    p_id,
    'success',
    v_new.document_code,
    to_jsonb(v_old),
    to_jsonb(v_new),
    'Requisito documental municipal actualizado',
    'web'
  );
exception
  when unique_violation then
    raise exception 'Já existe um requisito com este código e tipo de veículo';
end;
$$;

revoke all on function public.create_document_requirement(text,text,text,boolean,boolean,boolean) from public;
revoke all on function public.update_document_requirement(uuid,text,text,text,boolean,boolean,boolean) from public;

grant execute on function public.create_document_requirement(text,text,text,boolean,boolean,boolean) to authenticated;
grant execute on function public.update_document_requirement(uuid,text,text,text,boolean,boolean,boolean) to authenticated;

revoke insert, update, delete on public.document_requirements from authenticated;
grant select on public.document_requirements to authenticated;
