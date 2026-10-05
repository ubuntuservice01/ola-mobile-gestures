-- MobiGest — publicação pública de veículos à venda
-- Declaração do proprietário, gestão pelo técnico municipal e montra na Consulta Pública.

create table if not exists public.vehicle_sale_listings (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null unique references public.vehicles(id) on delete cascade,
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  price numeric(14,2) not null check (price > 0),
  vehicle_condition text not null
    check (vehicle_condition in ('excelente','boa','razoavel','necessita_reparacao')),
  declared_problems text,
  public_contact_name text not null,
  public_contact_phone text not null,
  public_location text not null,
  consent_confirmed boolean not null default false,
  published_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (char_length(trim(public_contact_name)) between 2 and 120),
  check (char_length(trim(public_contact_phone)) between 7 and 30),
  check (char_length(trim(public_location)) between 2 and 180),
  check (declared_problems is null or char_length(declared_problems) <= 2000)
);

create index if not exists vehicle_sale_listings_municipality_idx
  on public.vehicle_sale_listings(municipality_id, published_at desc);

create table if not exists public.vehicle_sale_photos (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  listing_id uuid not null references public.vehicle_sale_listings(id) on delete cascade,
  file_path text not null unique,
  position smallint not null check (position between 1 and 6),
  created_at timestamptz not null default now(),
  unique (listing_id, position)
);

create index if not exists vehicle_sale_photos_vehicle_idx
  on public.vehicle_sale_photos(vehicle_id, position);

alter table public.vehicle_sale_listings enable row level security;
alter table public.vehicle_sale_photos enable row level security;

revoke all on public.vehicle_sale_listings, public.vehicle_sale_photos from anon;
revoke insert, update, delete on public.vehicle_sale_listings, public.vehicle_sale_photos from authenticated;
grant select on public.vehicle_sale_listings, public.vehicle_sale_photos to authenticated;
grant select, insert, update, delete on public.vehicle_sale_listings, public.vehicle_sale_photos to service_role;

drop policy if exists vehicle_sale_listings_select_scoped on public.vehicle_sale_listings;
create policy vehicle_sale_listings_select_scoped
on public.vehicle_sale_listings
for select
to authenticated
using ((select private.same_municipality(municipality_id)));

drop policy if exists vehicle_sale_photos_select_scoped on public.vehicle_sale_photos;
create policy vehicle_sale_photos_select_scoped
on public.vehicle_sale_photos
for select
to authenticated
using ((select private.vehicle_in_scope(vehicle_id)));

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'mobigest-sale-photos',
  'mobigest-sale-photos',
  true,
  8388608,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.can_manage_sale_photo(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_municipality uuid;
  v_vehicle uuid;
begin
  begin
    v_municipality := split_part(p_name, '/', 1)::uuid;
    v_vehicle := split_part(p_name, '/', 2)::uuid;
  exception when others then
    return false;
  end;

  return exists (
    select 1
    from public.vehicles v
    where v.id = v_vehicle
      and v.municipality_id = v_municipality
      and (select private.can_operate_in_municipality(
        v.municipality_id,
        'vehicles.update'
      ))
  );
end;
$$;

revoke all on function private.can_manage_sale_photo(text) from public;
grant execute on function private.can_manage_sale_photo(text) to authenticated;

drop policy if exists mobigest_sale_photos_select on storage.objects;
create policy mobigest_sale_photos_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'mobigest-sale-photos'
  and (select private.can_manage_sale_photo(name))
);

drop policy if exists mobigest_sale_photos_insert on storage.objects;
create policy mobigest_sale_photos_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'mobigest-sale-photos'
  and (select private.can_manage_sale_photo(name))
);

drop policy if exists mobigest_sale_photos_update on storage.objects;
create policy mobigest_sale_photos_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'mobigest-sale-photos'
  and (select private.can_manage_sale_photo(name))
)
with check (
  bucket_id = 'mobigest-sale-photos'
  and (select private.can_manage_sale_photo(name))
);

drop policy if exists mobigest_sale_photos_delete on storage.objects;
create policy mobigest_sale_photos_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'mobigest-sale-photos'
  and (select private.can_manage_sale_photo(name))
);

create or replace function private.enforce_sale_requires_active()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status <> 'activa' then
    new.commercial_status := 'normal';
  end if;
  return new;
end;
$$;

drop trigger if exists vehicles_sale_requires_active on public.vehicles;
create trigger vehicles_sale_requires_active
before insert or update of status on public.vehicles
for each row execute function private.enforce_sale_requires_active();

create or replace function public.publish_vehicle_sale(
  p_vehicle_id uuid,
  p_price numeric,
  p_vehicle_condition text,
  p_declared_problems text,
  p_contact_name text,
  p_contact_phone text,
  p_location text,
  p_photo_paths text[],
  p_consent_confirmed boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_vehicle public.vehicles%rowtype;
  v_listing_id uuid;
  v_path text;
  v_position integer := 0;
begin
  if v_actor is null then
    raise exception 'Sessão inválida';
  end if;

  if p_price is null or p_price <= 0 then
    raise exception 'Informe um preço válido';
  end if;

  if p_vehicle_condition not in ('excelente','boa','razoavel','necessita_reparacao') then
    raise exception 'Condição do veículo inválida';
  end if;

  if nullif(trim(p_contact_name), '') is null
     or nullif(trim(p_contact_phone), '') is null
     or nullif(trim(p_location), '') is null then
    raise exception 'Nome, contacto e bairro/localidade são obrigatórios';
  end if;

  if not coalesce(p_consent_confirmed, false) then
    raise exception 'Confirme a autorização do proprietário para publicar os dados da venda';
  end if;

  if coalesce(array_length(p_photo_paths, 1), 0) < 1
     or coalesce(array_length(p_photo_paths, 1), 0) > 6 then
    raise exception 'Adicione entre 1 e 6 fotografias';
  end if;

  if (
    select count(distinct path_value)
    from unnest(p_photo_paths) as path_value
  ) <> array_length(p_photo_paths, 1) then
    raise exception 'As fotografias não podem estar duplicadas';
  end if;

  select * into v_vehicle
  from public.vehicles
  where id = p_vehicle_id
  for update;

  if v_vehicle.id is null then
    raise exception 'Veículo não encontrado';
  end if;

  if not (select private.can_operate_in_municipality(
    v_vehicle.municipality_id,
    'vehicles.update'
  )) then
    raise exception 'Sem permissão para publicar a venda deste veículo';
  end if;

  if v_vehicle.status <> 'activa' then
    raise exception 'Apenas veículos activos podem ser publicados à venda';
  end if;

  if v_vehicle.mobigest_number is null then
    raise exception 'O veículo precisa de um número MobiGest antes de ser publicado';
  end if;

  if v_vehicle.current_owner_id is null then
    raise exception 'O veículo precisa de um proprietário actual';
  end if;

  if not exists (
    select 1 from public.registrations r
    where r.vehicle_id = v_vehicle.id
      and r.status = 'aprovada'
  ) then
    raise exception 'O veículo precisa de um registo aprovado antes de ser publicado';
  end if;

  foreach v_path in array p_photo_paths loop
    if position(
      v_vehicle.municipality_id::text || '/' || v_vehicle.id::text || '/'
      in v_path
    ) <> 1 then
      raise exception 'Caminho de fotografia inválido';
    end if;

    if not exists (
      select 1
      from storage.objects o
      where o.bucket_id = 'mobigest-sale-photos'
        and o.name = v_path
    ) then
      raise exception 'Fotografia não encontrada no armazenamento';
    end if;
  end loop;

  insert into public.vehicle_sale_listings (
    vehicle_id, municipality_id, price, vehicle_condition,
    declared_problems, public_contact_name, public_contact_phone,
    public_location, consent_confirmed, published_at, updated_by, updated_at
  )
  values (
    v_vehicle.id, v_vehicle.municipality_id, p_price, p_vehicle_condition,
    nullif(trim(p_declared_problems), ''), trim(p_contact_name),
    trim(p_contact_phone), trim(p_location), true, now(), v_actor, now()
  )
  on conflict (vehicle_id)
  do update set
    price = excluded.price,
    vehicle_condition = excluded.vehicle_condition,
    declared_problems = excluded.declared_problems,
    public_contact_name = excluded.public_contact_name,
    public_contact_phone = excluded.public_contact_phone,
    public_location = excluded.public_location,
    consent_confirmed = true,
    published_at = now(),
    updated_by = v_actor,
    updated_at = now()
  returning id into v_listing_id;

  delete from public.vehicle_sale_photos
  where listing_id = v_listing_id;

  foreach v_path in array p_photo_paths loop
    v_position := v_position + 1;
    insert into public.vehicle_sale_photos (
      vehicle_id, listing_id, file_path, position
    )
    values (
      v_vehicle.id, v_listing_id, v_path, v_position
    );
  end loop;

  update public.vehicles
  set commercial_status = 'a_venda',
      updated_by = v_actor,
      updated_at = now()
  where id = v_vehicle.id;

  insert into public.audit_logs (
    actor_user_id, actor_role, municipality_id, module, action,
    entity_type, entity_id, result, reference, new_values,
    observation, origin
  )
  values (
    v_actor,
    (select private.current_role()),
    v_vehicle.municipality_id,
    'vehicles',
    'publish_sale',
    'vehicle',
    v_vehicle.id,
    'success',
    v_vehicle.mobigest_number,
    jsonb_build_object(
      'commercial_status', 'a_venda',
      'price', p_price,
      'vehicle_condition', p_vehicle_condition,
      'photo_count', array_length(p_photo_paths, 1)
    ),
    'Venda declarada pelo proprietário e publicada por utilizador autorizado',
    'web'
  );

  return v_listing_id;
end;
$$;

revoke all on function public.publish_vehicle_sale(
  uuid,numeric,text,text,text,text,text,text[],boolean
) from public;
revoke execute on function public.publish_vehicle_sale(
  uuid,numeric,text,text,text,text,text,text[],boolean
) from anon;
grant execute on function public.publish_vehicle_sale(
  uuid,numeric,text,text,text,text,text,text[],boolean
) to authenticated;

create or replace function public.list_public_vehicle_sales()
returns table (
  listing_id uuid,
  vehicle_id uuid,
  mobigest_number text,
  vehicle_type text,
  make text,
  model text,
  color text,
  manufacture_year integer,
  price numeric,
  vehicle_condition text,
  declared_problems text,
  contact_name text,
  contact_phone text,
  location text,
  municipality_name text,
  published_at timestamptz,
  photo_paths text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    l.id, v.id, v.mobigest_number, v.vehicle_type, v.make, v.model,
    v.color, v.manufacture_year, l.price, l.vehicle_condition,
    l.declared_problems, l.public_contact_name, l.public_contact_phone,
    l.public_location, m.name, l.published_at,
    coalesce(
      array_agg(p.file_path order by p.position)
        filter (where p.file_path is not null),
      array[]::text[]
    )
  from public.vehicle_sale_listings l
  join public.vehicles v on v.id = l.vehicle_id
  join public.municipalities m on m.id = l.municipality_id
  left join public.vehicle_sale_photos p on p.listing_id = l.id
  where
    l.consent_confirmed = true
    and v.commercial_status = 'a_venda'
    and v.status = 'activa'
    and v.mobigest_number is not null
    and exists (
      select 1 from public.registrations r
      where r.vehicle_id = v.id
        and r.status = 'aprovada'
    )
  group by
    l.id, v.id, v.mobigest_number, v.vehicle_type, v.make, v.model,
    v.color, v.manufacture_year, l.price, l.vehicle_condition,
    l.declared_problems, l.public_contact_name, l.public_contact_phone,
    l.public_location, m.name, l.published_at
  order by l.published_at desc;
$$;

revoke all on function public.list_public_vehicle_sales() from public;
grant execute on function public.list_public_vehicle_sales() to anon, authenticated;
