-- MobiGest — proprietários: território, unicidade e operações auditadas

alter table public.owners
  add column if not exists administrative_post_id uuid
    references public.administrative_posts(id) on delete restrict,
  add column if not exists locality_id uuid
    references public.localities(id) on delete restrict;

create index if not exists owners_post_idx
  on public.owners(administrative_post_id);

create index if not exists owners_locality_idx
  on public.owners(locality_id);

create unique index if not exists owners_document_unique_per_municipality_idx
  on public.owners (
    municipality_id,
    lower(document_type),
    upper(document_number)
  )
  where document_type is not null
    and trim(document_type) <> ''
    and document_number is not null
    and trim(document_number) <> '';

drop trigger if exists owners_validate_territory on public.owners;
create trigger owners_validate_territory
before insert or update on public.owners
for each row execute function private.validate_territory_consistency();

create or replace function private.can_manage_operational_owner(
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
    when p_permission not in ('owners.create','owners.update') then false
    when (select private.is_super_admin())
      then (select private.super_admin_has_assistance(p_municipality_id))
    else
      p_municipality_id = (select private.current_municipality_id())
      and (select private.authorize(p_permission))
  end;
$$;

revoke all on function private.can_manage_operational_owner(uuid,text) from public;
grant execute on function private.can_manage_operational_owner(uuid,text) to authenticated;

create or replace function public.create_owner(
  p_full_name text,
  p_document_type text default null,
  p_document_number text default null,
  p_nuit text default null,
  p_phone text default null,
  p_alternate_phone text default null,
  p_email text default null,
  p_address text default null,
  p_administrative_post_id uuid default null,
  p_locality_id uuid default null,
  p_notes text default null
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

  if not (select private.can_manage_operational_owner(v_municipality, 'owners.create')) then
    raise exception 'Sem permissão para registar proprietários';
  end if;

  if nullif(trim(p_full_name), '') is null then
    raise exception 'Nome completo do proprietário é obrigatório';
  end if;

  insert into public.owners (
    municipality_id,
    administrative_post_id,
    locality_id,
    full_name,
    document_type,
    document_number,
    nuit,
    phone,
    alternate_phone,
    email,
    address,
    notes,
    status,
    created_by,
    updated_by
  )
  values (
    v_municipality,
    p_administrative_post_id,
    p_locality_id,
    trim(p_full_name),
    nullif(trim(p_document_type), ''),
    nullif(upper(trim(p_document_number)), ''),
    nullif(trim(p_nuit), ''),
    nullif(trim(p_phone), ''),
    nullif(trim(p_alternate_phone), ''),
    nullif(lower(trim(p_email)), ''),
    nullif(trim(p_address), ''),
    nullif(trim(p_notes), ''),
    'activo',
    v_actor,
    v_actor
  )
  returning id into v_id;

  insert into public.audit_logs (
    actor_user_id, actor_role, municipality_id, module, action,
    entity_type, entity_id, result, reference, new_values, observation, origin
  )
  select
    v_actor,
    (select private.current_role()),
    v_municipality,
    'owners',
    'create',
    'owner',
    v_id,
    'success',
    coalesce(document_number, v_id::text),
    jsonb_build_object(
      'full_name', full_name,
      'document_type', document_type,
      'document_number', document_number,
      'nuit', nuit,
      'phone', phone,
      'administrative_post_id', administrative_post_id,
      'locality_id', locality_id,
      'status', status
    ),
    'Proprietário registado',
    'web'
  from public.owners
  where id = v_id;

  return v_id;
exception
  when unique_violation then
    raise exception 'Já existe um proprietário com este documento no município';
end;
$$;

create or replace function public.update_owner(
  p_id uuid,
  p_full_name text,
  p_document_type text default null,
  p_document_number text default null,
  p_nuit text default null,
  p_phone text default null,
  p_alternate_phone text default null,
  p_email text default null,
  p_address text default null,
  p_administrative_post_id uuid default null,
  p_locality_id uuid default null,
  p_notes text default null,
  p_status text default 'activo'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_old public.owners%rowtype;
  v_new public.owners%rowtype;
begin
  if p_status not in ('activo','inactivo','bloqueado') then
    raise exception 'Estado do proprietário inválido';
  end if;

  select * into v_old
  from public.owners
  where id = p_id
  for update;

  if v_old.id is null then
    raise exception 'Proprietário não encontrado';
  end if;

  if not (select private.can_manage_operational_owner(v_old.municipality_id, 'owners.update')) then
    raise exception 'Sem permissão para alterar este proprietário';
  end if;

  if nullif(trim(p_full_name), '') is null then
    raise exception 'Nome completo do proprietário é obrigatório';
  end if;

  update public.owners
  set
    administrative_post_id = p_administrative_post_id,
    locality_id = p_locality_id,
    full_name = trim(p_full_name),
    document_type = nullif(trim(p_document_type), ''),
    document_number = nullif(upper(trim(p_document_number)), ''),
    nuit = nullif(trim(p_nuit), ''),
    phone = nullif(trim(p_phone), ''),
    alternate_phone = nullif(trim(p_alternate_phone), ''),
    email = nullif(lower(trim(p_email)), ''),
    address = nullif(trim(p_address), ''),
    notes = nullif(trim(p_notes), ''),
    status = p_status,
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
    'owners',
    'update',
    'owner',
    p_id,
    'success',
    coalesce(v_new.document_number, p_id::text),
    jsonb_build_object(
      'full_name', v_old.full_name,
      'document_type', v_old.document_type,
      'document_number', v_old.document_number,
      'nuit', v_old.nuit,
      'phone', v_old.phone,
      'administrative_post_id', v_old.administrative_post_id,
      'locality_id', v_old.locality_id,
      'status', v_old.status
    ),
    jsonb_build_object(
      'full_name', v_new.full_name,
      'document_type', v_new.document_type,
      'document_number', v_new.document_number,
      'nuit', v_new.nuit,
      'phone', v_new.phone,
      'administrative_post_id', v_new.administrative_post_id,
      'locality_id', v_new.locality_id,
      'status', v_new.status
    ),
    'Dados do proprietário actualizados',
    'web'
  );
exception
  when unique_violation then
    raise exception 'Já existe um proprietário com este documento no município';
end;
$$;

revoke all on function public.create_owner(text,text,text,text,text,text,text,text,uuid,uuid,text) from public;
revoke all on function public.update_owner(uuid,text,text,text,text,text,text,text,text,uuid,uuid,text,text) from public;

grant execute on function public.create_owner(text,text,text,text,text,text,text,text,uuid,uuid,text) to authenticated;
grant execute on function public.update_owner(uuid,text,text,text,text,text,text,text,text,uuid,uuid,text,text) to authenticated;

revoke insert, update, delete on public.owners from authenticated;
grant select on public.owners to authenticated;
