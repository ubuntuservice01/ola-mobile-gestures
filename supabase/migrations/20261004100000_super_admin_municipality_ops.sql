-- MobiGest — operações institucionais do Super Admin sobre municípios
-- Criação, edição e alteração de estado são centralizadas em RPCs auditadas.

create or replace function public.super_admin_create_municipality(
  p_name text,
  p_code text,
  p_province text,
  p_area text default null,
  p_institutional_phone text default null,
  p_institutional_email text default null,
  p_address text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_id uuid;
  v_code text := upper(trim(p_code));
begin
  if v_actor is null
     or not (select private.is_super_admin())
     or not (select private.authorize('municipalities.manage')) then
    raise exception 'Acesso negado';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'Nome do município é obrigatório';
  end if;

  if nullif(v_code, '') is null or v_code !~ '^[A-Z0-9]{2,10}$' then
    raise exception 'Código municipal inválido';
  end if;

  if nullif(trim(p_province), '') is null then
    raise exception 'Província é obrigatória';
  end if;

  insert into public.municipalities (
    name,
    code,
    province,
    area,
    institutional_phone,
    institutional_email,
    address,
    status
  )
  values (
    trim(p_name),
    v_code,
    trim(p_province),
    nullif(trim(p_area), ''),
    nullif(trim(p_institutional_phone), ''),
    nullif(lower(trim(p_institutional_email)), ''),
    nullif(trim(p_address), ''),
    'configuracao'
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
  select
    v_actor,
    'super_admin',
    v_id,
    'municipalities',
    'create',
    'municipality',
    v_id,
    'success',
    v_code,
    to_jsonb(m),
    'Município criado pelo Super Administrador',
    'web'
  from public.municipalities m
  where m.id = v_id;

  return v_id;
exception
  when unique_violation then
    raise exception 'Já existe um município com o código %', v_code;
end;
$$;

create or replace function public.super_admin_update_municipality(
  p_municipality_id uuid,
  p_name text,
  p_code text,
  p_province text,
  p_area text default null,
  p_institutional_phone text default null,
  p_institutional_email text default null,
  p_address text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_old public.municipalities%rowtype;
  v_new public.municipalities%rowtype;
  v_code text := upper(trim(p_code));
begin
  if v_actor is null
     or not (select private.is_super_admin())
     or not (select private.authorize('municipalities.manage')) then
    raise exception 'Acesso negado';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'Nome do município é obrigatório';
  end if;

  if nullif(v_code, '') is null or v_code !~ '^[A-Z0-9]{2,10}$' then
    raise exception 'Código municipal inválido';
  end if;

  if nullif(trim(p_province), '') is null then
    raise exception 'Província é obrigatória';
  end if;

  select *
    into v_old
  from public.municipalities
  where id = p_municipality_id
  for update;

  if v_old.id is null then
    raise exception 'Município não encontrado';
  end if;

  update public.municipalities
  set
    name = trim(p_name),
    code = v_code,
    province = trim(p_province),
    area = nullif(trim(p_area), ''),
    institutional_phone = nullif(trim(p_institutional_phone), ''),
    institutional_email = nullif(lower(trim(p_institutional_email)), ''),
    address = nullif(trim(p_address), '')
  where id = p_municipality_id
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
    'super_admin',
    p_municipality_id,
    'municipalities',
    'update',
    'municipality',
    p_municipality_id,
    'success',
    v_new.code,
    to_jsonb(v_old),
    to_jsonb(v_new),
    'Dados institucionais do município actualizados',
    'web'
  );
exception
  when unique_violation then
    raise exception 'Já existe um município com o código %', v_code;
end;
$$;

create or replace function public.super_admin_set_municipality_status(
  p_municipality_id uuid,
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
  v_old public.municipalities%rowtype;
  v_new public.municipalities%rowtype;
  v_status text := lower(trim(p_status));
begin
  if v_actor is null
     or not (select private.is_super_admin())
     or not (select private.authorize('municipalities.manage')) then
    raise exception 'Acesso negado';
  end if;

  if v_status not in ('configuracao','activo','suspenso','inactivo') then
    raise exception 'Estado municipal inválido';
  end if;

  if nullif(trim(p_reason), '') is null then
    raise exception 'O motivo da alteração de estado é obrigatório';
  end if;

  select *
    into v_old
  from public.municipalities
  where id = p_municipality_id
  for update;

  if v_old.id is null then
    raise exception 'Município não encontrado';
  end if;

  if v_old.status = v_status then
    raise exception 'O município já se encontra no estado %', v_status;
  end if;

  update public.municipalities
  set status = v_status
  where id = p_municipality_id
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
    'super_admin',
    p_municipality_id,
    'municipalities',
    'change_status',
    'municipality',
    p_municipality_id,
    'success',
    v_new.code,
    jsonb_build_object('status', v_old.status),
    jsonb_build_object('status', v_new.status),
    trim(p_reason),
    'web'
  );
end;
$$;

revoke all on function public.super_admin_create_municipality(text,text,text,text,text,text,text) from public;
revoke all on function public.super_admin_update_municipality(uuid,text,text,text,text,text,text,text) from public;
revoke all on function public.super_admin_set_municipality_status(uuid,text,text) from public;

grant execute on function public.super_admin_create_municipality(text,text,text,text,text,text,text) to authenticated;
grant execute on function public.super_admin_update_municipality(uuid,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.super_admin_set_municipality_status(uuid,text,text) to authenticated;

-- Escritas directas deixam de ser permitidas pelo cliente.
-- Toda mutação administrativa passa pelas RPCs acima e gera auditoria.
revoke insert, update, delete on public.municipalities from authenticated;
grant select on public.municipalities to authenticated;
