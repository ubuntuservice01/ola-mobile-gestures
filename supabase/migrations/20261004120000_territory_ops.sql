-- MobiGest — operações auditadas da estrutura territorial municipal

create or replace function private.current_operational_municipality_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select private.is_super_admin())
      then (select private.current_super_admin_access_municipality())
    else (select private.current_municipality_id())
  end;
$$;

revoke all on function private.current_operational_municipality_id() from public;
grant execute on function private.current_operational_municipality_id() to authenticated;

create or replace function private.can_manage_operational_territory(
  p_municipality_id uuid
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
      and (select private.authorize('settings.manage'))
  end;
$$;

revoke all on function private.can_manage_operational_territory(uuid) from public;
grant execute on function private.can_manage_operational_territory(uuid) to authenticated;

create or replace function public.create_administrative_post(
  p_name text,
  p_code text default null
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
  v_code text := nullif(upper(trim(p_code)), '');
begin
  if v_actor is null or v_municipality is null then
    raise exception 'Contexto municipal não disponível';
  end if;

  if not (select private.can_manage_operational_territory(v_municipality)) then
    raise exception 'Sem permissão para gerir a estrutura territorial';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'Nome do posto administrativo é obrigatório';
  end if;

  insert into public.administrative_posts (
    municipality_id,
    name,
    code,
    status
  )
  values (
    v_municipality,
    trim(p_name),
    v_code,
    'activo'
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
    'territory',
    'create_post',
    'administrative_post',
    v_id,
    'success',
    v_code,
    jsonb_build_object('name', trim(p_name), 'code', v_code, 'status', 'activo'),
    'Posto administrativo criado',
    'web'
  );

  return v_id;
exception
  when unique_violation then
    raise exception 'Já existe um posto administrativo com este nome ou código';
end;
$$;

create or replace function public.update_administrative_post(
  p_id uuid,
  p_name text,
  p_code text,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_old public.administrative_posts%rowtype;
  v_new public.administrative_posts%rowtype;
  v_code text := nullif(upper(trim(p_code)), '');
begin
  if p_status not in ('activo','inactivo') then
    raise exception 'Estado do posto administrativo inválido';
  end if;

  select * into v_old
  from public.administrative_posts
  where id = p_id
  for update;

  if v_old.id is null then
    raise exception 'Posto administrativo não encontrado';
  end if;

  if not (select private.can_manage_operational_territory(v_old.municipality_id)) then
    raise exception 'Sem permissão para alterar este posto administrativo';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'Nome do posto administrativo é obrigatório';
  end if;

  if p_status = 'inactivo' and exists (
    select 1 from public.localities l
    where l.administrative_post_id = p_id
      and l.status = 'activo'
  ) then
    raise exception 'Inactive primeiro as localidades activas deste posto';
  end if;

  update public.administrative_posts
  set name = trim(p_name),
      code = v_code,
      status = p_status
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
    'territory',
    'update_post',
    'administrative_post',
    p_id,
    'success',
    v_new.code,
    to_jsonb(v_old),
    to_jsonb(v_new),
    'Posto administrativo actualizado',
    'web'
  );
exception
  when unique_violation then
    raise exception 'Já existe um posto administrativo com este nome ou código';
end;
$$;

create or replace function public.create_locality(
  p_administrative_post_id uuid,
  p_name text,
  p_code text default null,
  p_type text default 'localidade'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_post public.administrative_posts%rowtype;
  v_id uuid;
  v_code text := nullif(upper(trim(p_code)), '');
begin
  if p_type not in ('localidade','bairro','povoacao','outro') then
    raise exception 'Tipo de localidade inválido';
  end if;

  select * into v_post
  from public.administrative_posts
  where id = p_administrative_post_id;

  if v_post.id is null or v_post.status <> 'activo' then
    raise exception 'Posto administrativo inválido ou inactivo';
  end if;

  if not (select private.can_manage_operational_territory(v_post.municipality_id)) then
    raise exception 'Sem permissão para gerir localidades neste município';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'Nome da localidade/bairro é obrigatório';
  end if;

  insert into public.localities (
    municipality_id,
    administrative_post_id,
    name,
    code,
    type,
    status
  )
  values (
    v_post.municipality_id,
    v_post.id,
    trim(p_name),
    v_code,
    p_type,
    'activo'
  )
  returning id into v_id;

  insert into public.audit_logs (
    actor_user_id, actor_role, municipality_id, module, action,
    entity_type, entity_id, result, reference, new_values, observation, origin
  )
  values (
    v_actor,
    (select private.current_role()),
    v_post.municipality_id,
    'territory',
    'create_locality',
    'locality',
    v_id,
    'success',
    v_code,
    jsonb_build_object(
      'name', trim(p_name),
      'code', v_code,
      'type', p_type,
      'administrative_post_id', v_post.id,
      'status', 'activo'
    ),
    'Localidade/bairro criado',
    'web'
  );

  return v_id;
exception
  when unique_violation then
    raise exception 'Já existe uma localidade/bairro com este nome ou código neste posto';
end;
$$;

create or replace function public.update_locality(
  p_id uuid,
  p_administrative_post_id uuid,
  p_name text,
  p_code text,
  p_type text,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_old public.localities%rowtype;
  v_new public.localities%rowtype;
  v_post public.administrative_posts%rowtype;
  v_code text := nullif(upper(trim(p_code)), '');
begin
  if p_type not in ('localidade','bairro','povoacao','outro') then
    raise exception 'Tipo de localidade inválido';
  end if;

  if p_status not in ('activo','inactivo') then
    raise exception 'Estado da localidade inválido';
  end if;

  select * into v_old
  from public.localities
  where id = p_id
  for update;

  if v_old.id is null then
    raise exception 'Localidade/bairro não encontrado';
  end if;

  if not (select private.can_manage_operational_territory(v_old.municipality_id)) then
    raise exception 'Sem permissão para alterar esta localidade';
  end if;

  select * into v_post
  from public.administrative_posts
  where id = p_administrative_post_id
    and municipality_id = v_old.municipality_id;

  if v_post.id is null or v_post.status <> 'activo' then
    raise exception 'Posto administrativo de destino inválido ou inactivo';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'Nome da localidade/bairro é obrigatório';
  end if;

  update public.localities
  set administrative_post_id = v_post.id,
      name = trim(p_name),
      code = v_code,
      type = p_type,
      status = p_status
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
    'territory',
    'update_locality',
    'locality',
    p_id,
    'success',
    v_new.code,
    to_jsonb(v_old),
    to_jsonb(v_new),
    'Localidade/bairro actualizada',
    'web'
  );
exception
  when unique_violation then
    raise exception 'Já existe uma localidade/bairro com este nome ou código neste posto';
end;
$$;

revoke all on function public.create_administrative_post(text,text) from public;
revoke all on function public.update_administrative_post(uuid,text,text,text) from public;
revoke all on function public.create_locality(uuid,text,text,text) from public;
revoke all on function public.update_locality(uuid,uuid,text,text,text,text) from public;

grant execute on function public.create_administrative_post(text,text) to authenticated;
grant execute on function public.update_administrative_post(uuid,text,text,text) to authenticated;
grant execute on function public.create_locality(uuid,text,text,text) to authenticated;
grant execute on function public.update_locality(uuid,uuid,text,text,text,text) to authenticated;

revoke insert, update, delete on public.administrative_posts from authenticated;
revoke insert, update, delete on public.localities from authenticated;
grant select on public.administrative_posts, public.localities to authenticated;
