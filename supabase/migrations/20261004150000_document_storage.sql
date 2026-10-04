-- MobiGest — armazenamento privado e validação auditada de documentos

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'mobigest-documents',
  'mobigest-documents',
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

create or replace function private.document_subject_municipality(
  p_subject_type text,
  p_subject_id uuid
)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_municipality uuid;
begin
  case p_subject_type
    when 'owner' then
      select municipality_id into v_municipality
      from public.owners where id = p_subject_id;
    when 'vehicle' then
      select municipality_id into v_municipality
      from public.vehicles where id = p_subject_id;
    when 'registration' then
      select municipality_id into v_municipality
      from public.registrations where id = p_subject_id;
    else
      raise exception 'Tipo de entidade documental inválido';
  end case;

  return v_municipality;
end;
$$;

revoke all on function private.document_subject_municipality(text,uuid) from public;
grant execute on function private.document_subject_municipality(text,uuid) to authenticated;

drop policy if exists "mobigest_documents_select" on storage.objects;
create policy "mobigest_documents_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'mobigest-documents'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (select private.same_municipality(split_part(name, '/', 1)::uuid))
  and (select private.authorize('documents.view'))
);

drop policy if exists "mobigest_documents_insert" on storage.objects;
create policy "mobigest_documents_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'mobigest-documents'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (select private.can_operate_in_municipality(
    split_part(name, '/', 1)::uuid,
    'documents.create'
  ))
);

drop policy if exists "mobigest_documents_update" on storage.objects;
create policy "mobigest_documents_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'mobigest-documents'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (select private.can_operate_in_municipality(
    split_part(name, '/', 1)::uuid,
    'documents.update'
  ))
)
with check (
  bucket_id = 'mobigest-documents'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (select private.can_operate_in_municipality(
    split_part(name, '/', 1)::uuid,
    'documents.update'
  ))
);

drop policy if exists "mobigest_documents_delete" on storage.objects;
create policy "mobigest_documents_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'mobigest-documents'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (select private.can_operate_in_municipality(
    split_part(name, '/', 1)::uuid,
    'documents.update'
  ))
);

create or replace function public.create_document_metadata(
  p_subject_type text,
  p_subject_id uuid,
  p_document_type text,
  p_file_path text,
  p_document_number text default null,
  p_issued_at date default null,
  p_expires_at date default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_municipality uuid;
  v_document_id uuid;
  v_owner_id uuid;
  v_vehicle_id uuid;
  v_registration_id uuid;
  v_expected_prefix text;
begin
  if v_actor is null then
    raise exception 'Sessão inválida';
  end if;

  if nullif(trim(p_document_type), '') is null then
    raise exception 'Tipo de documento é obrigatório';
  end if;

  v_municipality :=
    (select private.document_subject_municipality(p_subject_type, p_subject_id));

  if v_municipality is null then
    raise exception 'Entidade documental não encontrada';
  end if;

  if not (select private.can_operate_in_municipality(
    v_municipality,
    'documents.create'
  )) then
    raise exception 'Sem permissão para adicionar documentos';
  end if;

  if p_expires_at is not null and p_issued_at is not null
     and p_expires_at < p_issued_at then
    raise exception 'A validade não pode ser anterior à data de emissão';
  end if;

  v_expected_prefix :=
    v_municipality::text || '/' ||
    p_subject_type || '/' ||
    p_subject_id::text || '/';

  if p_file_path is null
     or position(v_expected_prefix in p_file_path) <> 1 then
    raise exception 'Caminho do ficheiro não corresponde ao município/entidade';
  end if;

  if not exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'mobigest-documents'
      and o.name = p_file_path
  ) then
    raise exception 'Ficheiro não encontrado no armazenamento seguro';
  end if;

  if p_subject_type = 'owner' then
    v_owner_id := p_subject_id;
  elsif p_subject_type = 'vehicle' then
    v_vehicle_id := p_subject_id;
  elsif p_subject_type = 'registration' then
    v_registration_id := p_subject_id;
  else
    raise exception 'Tipo de entidade documental inválido';
  end if;

  insert into public.documents (
    municipality_id,
    owner_id,
    vehicle_id,
    registration_id,
    document_type,
    file_path,
    document_number,
    issued_at,
    expires_at,
    status,
    created_by
  )
  values (
    v_municipality,
    v_owner_id,
    v_vehicle_id,
    v_registration_id,
    trim(p_document_type),
    p_file_path,
    nullif(trim(p_document_number), ''),
    p_issued_at,
    p_expires_at,
    'em_validacao',
    v_actor
  )
  returning id into v_document_id;

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
    'create',
    'document',
    v_document_id,
    'success',
    p_document_type,
    jsonb_build_object(
      'subject_type', p_subject_type,
      'subject_id', p_subject_id,
      'document_type', trim(p_document_type),
      'file_path', p_file_path,
      'status', 'em_validacao'
    ),
    'Documento submetido para validação',
    'web'
  );

  return v_document_id;
end;
$$;

create or replace function public.validate_document(
  p_document_id uuid,
  p_status text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_old public.documents%rowtype;
  v_new public.documents%rowtype;
begin
  if p_status not in ('validado','rejeitado') then
    raise exception 'Estado de validação documental inválido';
  end if;

  select * into v_old
  from public.documents
  where id = p_document_id
  for update;

  if v_old.id is null then
    raise exception 'Documento não encontrado';
  end if;

  if not (select private.can_operate_in_municipality(
    v_old.municipality_id,
    'documents.validate'
  )) then
    raise exception 'Sem permissão para validar documentos';
  end if;

  if p_status = 'rejeitado'
     and nullif(trim(p_reason), '') is null then
    raise exception 'A rejeição exige fundamentação';
  end if;

  update public.documents
  set
    status = p_status,
    rejection_reason =
      case when p_status = 'rejeitado' then trim(p_reason) else null end,
    validated_by = v_actor,
    validated_at = now(),
    updated_at = now()
  where id = p_document_id
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
    'validate',
    'document',
    p_document_id,
    'success',
    v_old.document_type,
    jsonb_build_object(
      'status', v_old.status,
      'rejection_reason', v_old.rejection_reason
    ),
    jsonb_build_object(
      'status', v_new.status,
      'rejection_reason', v_new.rejection_reason
    ),
    nullif(trim(p_reason), ''),
    'web'
  );
end;
$$;

revoke all on function public.create_document_metadata(text,uuid,text,text,text,date,date) from public;
revoke all on function public.validate_document(uuid,text,text) from public;

grant execute on function public.create_document_metadata(text,uuid,text,text,text,date,date) to authenticated;
grant execute on function public.validate_document(uuid,text,text) to authenticated;

-- Metadados são mutados apenas pelas RPCs auditadas.
revoke insert, update, delete on public.documents from authenticated;
grant select on public.documents to authenticated;
