-- MobiGest — identidade institucional e área "Meu Município"

alter table public.municipalities
  add column if not exists website text,
  add column if not exists display_name text,
  add column if not exists abbreviation text,
  add column if not exists logo_path text,
  add column if not exists primary_color text not null default '#0284C7',
  add column if not exists secondary_color text not null default '#0F172A',
  add column if not exists accent_color text not null default '#38BDF8',
  add column if not exists document_header text,
  add column if not exists receipt_header text;

alter table public.municipalities
  drop constraint if exists municipalities_primary_color_check,
  drop constraint if exists municipalities_secondary_color_check,
  drop constraint if exists municipalities_accent_color_check,
  drop constraint if exists municipalities_abbreviation_check;

alter table public.municipalities
  add constraint municipalities_primary_color_check
    check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint municipalities_secondary_color_check
    check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint municipalities_accent_color_check
    check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint municipalities_abbreviation_check
    check (
      abbreviation is null
      or abbreviation ~ '^[A-Za-z0-9 ._-]{2,16}$'
    );

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'mobigest-branding',
  'mobigest-branding',
  true,
  2097152,
  array['image/png','image/jpeg','image/webp']
)
on conflict (id)
do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists mobigest_branding_select on storage.objects;
create policy mobigest_branding_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'mobigest-branding'
  and split_part(name, '/', 1)
    ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (
    select private.same_municipality(
      split_part(objects.name, '/', 1)::uuid
    )
  )
);

drop policy if exists mobigest_branding_insert on storage.objects;
create policy mobigest_branding_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'mobigest-branding'
  and split_part(name, '/', 1)
    ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (
    select private.can_operate_in_municipality(
      split_part(objects.name, '/', 1)::uuid,
      'settings.manage'
    )
  )
);

drop policy if exists mobigest_branding_update on storage.objects;
create policy mobigest_branding_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'mobigest-branding'
  and split_part(name, '/', 1)
    ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (
    select private.can_operate_in_municipality(
      split_part(objects.name, '/', 1)::uuid,
      'settings.manage'
    )
  )
)
with check (
  bucket_id = 'mobigest-branding'
  and split_part(name, '/', 1)
    ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (
    select private.can_operate_in_municipality(
      split_part(objects.name, '/', 1)::uuid,
      'settings.manage'
    )
  )
);

drop policy if exists mobigest_branding_delete on storage.objects;
create policy mobigest_branding_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'mobigest-branding'
  and split_part(name, '/', 1)
    ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (
    select private.can_operate_in_municipality(
      split_part(objects.name, '/', 1)::uuid,
      'settings.manage'
    )
  )
);

create or replace function public.current_municipality_identity()
returns table (
  id uuid,
  name text,
  code text,
  province text,
  area text,
  institutional_phone text,
  institutional_email text,
  address text,
  website text,
  status text,
  display_name text,
  abbreviation text,
  logo_path text,
  primary_color text,
  secondary_color text,
  accent_color text,
  document_header text,
  receipt_header text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_municipality uuid :=
    (select private.current_operational_municipality_id());
begin
  if v_municipality is null then
    raise exception 'Contexto municipal não disponível';
  end if;

  if not (
    select private.can_operate_in_municipality(
      v_municipality,
      'settings.view'
    )
  ) then
    raise exception 'Sem permissão para consultar os dados do município';
  end if;

  return query
  select
    m.id,
    m.name,
    m.code,
    m.province,
    m.area,
    m.institutional_phone,
    m.institutional_email,
    m.address,
    m.website,
    m.status,
    m.display_name,
    m.abbreviation,
    m.logo_path,
    m.primary_color,
    m.secondary_color,
    m.accent_color,
    m.document_header,
    m.receipt_header
  from public.municipalities m
  where m.id = v_municipality;
end;
$$;

create or replace function public.update_current_municipality_identity(
  p_name text,
  p_province text,
  p_area text default null,
  p_institutional_phone text default null,
  p_institutional_email text default null,
  p_address text default null,
  p_website text default null,
  p_display_name text default null,
  p_abbreviation text default null,
  p_logo_path text default null,
  p_primary_color text default '#0284C7',
  p_secondary_color text default '#0F172A',
  p_accent_color text default '#38BDF8',
  p_document_header text default null,
  p_receipt_header text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_municipality uuid :=
    (select private.current_operational_municipality_id());
  v_old public.municipalities%rowtype;
  v_new public.municipalities%rowtype;
  v_email text := nullif(lower(trim(p_institutional_email)), '');
  v_website text := nullif(trim(p_website), '');
  v_abbreviation text := nullif(upper(trim(p_abbreviation)), '');
  v_logo_path text := nullif(trim(p_logo_path), '');
begin
  if v_actor is null or v_municipality is null then
    raise exception 'Contexto municipal não disponível';
  end if;

  if not (
    select private.can_operate_in_municipality(
      v_municipality,
      'settings.manage'
    )
  ) then
    raise exception 'Sem permissão para alterar o município';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'Nome do município é obrigatório';
  end if;

  if nullif(trim(p_province), '') is null then
    raise exception 'Província é obrigatória';
  end if;

  if v_email is not null
     and v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Email institucional inválido';
  end if;

  if v_website is not null
     and v_website !~* '^https?://[^[:space:]]+$' then
    raise exception 'Website inválido. Use http:// ou https://';
  end if;

  if v_abbreviation is not null
     and v_abbreviation !~ '^[A-Z0-9 ._-]{2,16}$' then
    raise exception 'Abreviatura inválida';
  end if;

  if p_primary_color !~ '^#[0-9A-Fa-f]{6}$'
     or p_secondary_color !~ '^#[0-9A-Fa-f]{6}$'
     or p_accent_color !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'Cor institucional inválida';
  end if;

  if v_logo_path is not null
     and v_logo_path not like v_municipality::text || '/%' then
    raise exception 'O logótipo não pertence ao município actual';
  end if;

  if length(coalesce(p_document_header, '')) > 240
     or length(coalesce(p_receipt_header, '')) > 240 then
    raise exception 'Cabeçalho institucional demasiado longo';
  end if;

  select *
  into v_old
  from public.municipalities
  where id = v_municipality
  for update;

  if v_old.id is null then
    raise exception 'Município não encontrado';
  end if;

  update public.municipalities
  set
    name = trim(p_name),
    province = trim(p_province),
    area = nullif(trim(p_area), ''),
    institutional_phone = nullif(trim(p_institutional_phone), ''),
    institutional_email = v_email,
    address = nullif(trim(p_address), ''),
    website = v_website,
    display_name = nullif(trim(p_display_name), ''),
    abbreviation = v_abbreviation,
    logo_path = v_logo_path,
    primary_color = upper(p_primary_color),
    secondary_color = upper(p_secondary_color),
    accent_color = upper(p_accent_color),
    document_header = nullif(trim(p_document_header), ''),
    receipt_header = nullif(trim(p_receipt_header), ''),
    updated_at = now()
  where id = v_municipality
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
    v_municipality,
    'settings',
    'update_municipality_identity',
    'municipality',
    v_municipality,
    'success',
    v_new.code,
    to_jsonb(v_old),
    to_jsonb(v_new),
    'Identidade institucional do município actualizada',
    'web'
  );
end;
$$;

create or replace function public.current_municipality_statistics()
returns table (
  municipality_id uuid,
  vehicles_total bigint,
  motorcycles_total bigint,
  cars_total bigint,
  bicycles_total bigint,
  owners_total bigint,
  drivers_total bigint,
  registrations_total bigint,
  fines_total bigint,
  revenue_total numeric,
  users_total bigint,
  posts_total bigint,
  localities_total bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_municipality uuid :=
    (select private.current_operational_municipality_id());
begin
  if v_municipality is null then
    raise exception 'Contexto municipal não disponível';
  end if;

  if not (
    select private.can_operate_in_municipality(
      v_municipality,
      'dashboard.view'
    )
  ) then
    raise exception 'Sem permissão para consultar estatísticas municipais';
  end if;

  return query
  select
    v_municipality,
    (select count(*) from public.vehicles v
      where v.municipality_id = v_municipality
        and v.status <> 'cancelada'),
    (select count(*) from public.vehicles v
      where v.municipality_id = v_municipality
        and v.status <> 'cancelada'
        and v.vehicle_type = 'motorizada'),
    (select count(*) from public.vehicles v
      where v.municipality_id = v_municipality
        and v.status <> 'cancelada'
        and v.vehicle_type = 'carro'),
    (select count(*) from public.vehicles v
      where v.municipality_id = v_municipality
        and v.status <> 'cancelada'
        and v.vehicle_type = 'bicicleta'),
    (select count(*) from public.owners o
      where o.municipality_id = v_municipality
        and o.status <> 'inactivo'),
    (select count(*) from public.drivers d
      where d.municipality_id = v_municipality),
    (select count(*) from public.registrations r
      where r.municipality_id = v_municipality),
    (select count(*) from public.fines f
      where f.municipality_id = v_municipality
        and f.status <> 'anulada'),
    (
      coalesce((
        select sum(p.amount)
        from public.payments p
        join public.charges c on c.id = p.charge_id
        where c.municipality_id = v_municipality
          and p.paid_at is not null
      ), 0)
      -
      coalesce((
        select sum(pr.amount)
        from public.payment_refunds pr
        where pr.municipality_id = v_municipality
      ), 0)
    )::numeric,
    (select count(*) from public.profiles p
      where p.municipality_id = v_municipality
        and p.role <> 'super_admin'),
    (select count(*) from public.administrative_posts ap
      where ap.municipality_id = v_municipality),
    (select count(*) from public.localities l
      where l.municipality_id = v_municipality);
end;
$$;

revoke all
on function public.current_municipality_identity()
from public;

revoke all
on function public.update_current_municipality_identity(
  text,text,text,text,text,text,text,text,text,text,text,text,text,text,text
)
from public;

revoke all
on function public.current_municipality_statistics()
from public;

grant execute
on function public.current_municipality_identity()
to authenticated;

grant execute
on function public.update_current_municipality_identity(
  text,text,text,text,text,text,text,text,text,text,text,text,text,text,text
)
to authenticated;

grant execute
on function public.current_municipality_statistics()
to authenticated;
