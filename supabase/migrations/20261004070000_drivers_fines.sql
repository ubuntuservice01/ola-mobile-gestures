-- MobiGest — Condutores/Taxistas e Multas
-- Extensão do modelo multi-município. Não altera migrations históricas.

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  administrative_post_id uuid references public.administrative_posts(id) on delete restrict,
  locality_id uuid references public.localities(id) on delete restrict,
  driver_type text not null default 'taxista'
    check (driver_type in ('taxista','condutor','mototaxista','outro')),
  reference text not null unique,
  full_name text not null,
  document_type text,
  document_number text,
  nuit text,
  phone text,
  email text,
  birth_date date,
  address text,
  qr_code text unique,
  status text not null default 'activo'
    check (status in ('activo','suspenso','inactivo','bloqueado')),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index drivers_municipality_idx on public.drivers(municipality_id);
create index drivers_reference_idx on public.drivers(reference);
create index drivers_document_idx on public.drivers(document_type, document_number);
create index drivers_phone_idx on public.drivers(phone);

create table public.driver_vehicles (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  driver_id uuid not null references public.drivers(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  is_primary boolean not null default true,
  starts_at date not null default current_date,
  ends_at date,
  status text not null default 'activo' check (status in ('activo','inactivo')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create index driver_vehicles_driver_idx on public.driver_vehicles(driver_id);
create index driver_vehicles_vehicle_idx on public.driver_vehicles(vehicle_id);

create table public.fine_types (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipalities(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  amount numeric(14,2) not null check (amount >= 0),
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (municipality_id, code)
);
create index fine_types_municipality_idx on public.fine_types(municipality_id);

create table public.fines (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipalities(id) on delete restrict,
  reference text not null unique,
  driver_id uuid not null references public.drivers(id) on delete restrict,
  vehicle_id uuid references public.vehicles(id) on delete restrict,
  fine_type_id uuid not null references public.fine_types(id) on delete restrict,
  fiscal_id uuid references public.profiles(id) on delete set null,
  charge_id uuid references public.charges(id) on delete set null,
  applied_amount numeric(14,2) not null check (applied_amount >= 0),
  location text,
  observation text,
  occurred_at timestamptz not null default now(),
  status text not null default 'pendente'
    check (status in ('pendente','paga','anulada','em_recurso')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index fines_municipality_idx on public.fines(municipality_id);
create index fines_driver_idx on public.fines(driver_id);
create index fines_vehicle_idx on public.fines(vehicle_id);
create index fines_status_idx on public.fines(status);
create index fines_occurred_idx on public.fines(occurred_at desc);

create table public.driver_numbering_counters (
  municipality_id uuid primary key references public.municipalities(id) on delete cascade,
  current_value bigint not null default 0 check (current_value >= 0),
  updated_at timestamptz not null default now()
);
create table public.fine_numbering_counters (
  municipality_id uuid not null references public.municipalities(id) on delete cascade,
  year integer not null check (year between 2000 and 2100),
  current_value bigint not null default 0 check (current_value >= 0),
  updated_at timestamptz not null default now(),
  primary key (municipality_id, year)
);

insert into public.permissions(code,module,action,description) values
 ('drivers.view','drivers','consultar','Consultar condutores e taxistas'),
 ('drivers.create','drivers','criar','Registar condutores e taxistas'),
 ('drivers.update','drivers','editar','Editar condutores e taxistas'),
 ('fines.view','fines','consultar','Consultar multas'),
 ('fines.create','fines','criar','Emitir multas'),
 ('fine_types.manage','fines','configurar','Gerir tipos e valores de multa')
on conflict(code) do update set module=excluded.module, action=excluded.action, description=excluded.description;

insert into public.role_permissions(role,permission_id,allowed)
select 'super_admin',id,true from public.permissions where code in ('drivers.view','drivers.create','drivers.update','fines.view','fines.create','fine_types.manage')
on conflict(role,permission_id) do update set allowed=true;
insert into public.role_permissions(role,permission_id,allowed)
select 'admin_municipal',id,true from public.permissions where code in ('drivers.view','drivers.create','drivers.update','fines.view','fines.create','fine_types.manage')
on conflict(role,permission_id) do update set allowed=true;
insert into public.role_permissions(role,permission_id,allowed)
select 'tecnico',id,true from public.permissions where code in ('drivers.view','drivers.create','drivers.update','fines.view')
on conflict(role,permission_id) do update set allowed=true;
insert into public.role_permissions(role,permission_id,allowed)
select 'fiscal',id,true from public.permissions where code in ('drivers.view','fines.view','fines.create')
on conflict(role,permission_id) do update set allowed=true;
insert into public.role_permissions(role,permission_id,allowed)
select 'financeiro',id,true from public.permissions where code in ('drivers.view','fines.view')
on conflict(role,permission_id) do update set allowed=true;

-- Integridade multi-municipio: impede associacoes entre registos de municipios diferentes.
create or replace function public.validate_driver_vehicle_scope() returns trigger
language plpgsql set search_path='' as $
declare d_municipality uuid; v_municipality uuid;
begin
  select municipality_id into d_municipality from public.drivers where id=new.driver_id;
  select municipality_id into v_municipality from public.vehicles where id=new.vehicle_id;
  if d_municipality is null or v_municipality is null or new.municipality_id <> d_municipality or new.municipality_id <> v_municipality then
    raise exception 'Condutor e veiculo devem pertencer ao mesmo municipio do vinculo';
  end if;
  return new;
end; $;

create trigger driver_vehicles_validate_scope
before insert or update on public.driver_vehicles
for each row execute function public.validate_driver_vehicle_scope();

create or replace function public.validate_fine_scope() returns trigger
language plpgsql set search_path='' as $
declare d_municipality uuid; v_municipality uuid; ft_municipality uuid; f_municipality uuid;
begin
  select municipality_id into d_municipality from public.drivers where id=new.driver_id;
  select municipality_id into ft_municipality from public.fine_types where id=new.fine_type_id;
  if d_municipality is null or ft_municipality is null or new.municipality_id <> d_municipality or new.municipality_id <> ft_municipality then
    raise exception 'Condutor e tipo de multa devem pertencer ao mesmo municipio da multa';
  end if;
  if new.vehicle_id is not null then
    select municipality_id into v_municipality from public.vehicles where id=new.vehicle_id;
    if v_municipality is null or new.municipality_id <> v_municipality then raise exception 'Veiculo deve pertencer ao mesmo municipio da multa'; end if;
  end if;
  if new.fiscal_id is not null then
    select municipality_id into f_municipality from public.profiles where id=new.fiscal_id;
    if f_municipality is null or new.municipality_id <> f_municipality then raise exception 'Fiscal deve pertencer ao mesmo municipio da multa'; end if;
  end if;
  return new;
end; $;

create trigger fines_validate_scope
before insert or update on public.fines
for each row execute function public.validate_fine_scope();

create or replace function private.driver_in_scope(driver_uuid uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.drivers d where d.id=driver_uuid and (select private.same_municipality(d.municipality_id)));
$$;
revoke all on function private.driver_in_scope(uuid) from public;
grant execute on function private.driver_in_scope(uuid) to authenticated;

create or replace function private.fine_in_scope(fine_uuid uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.fines f where f.id=fine_uuid and (select private.same_municipality(f.municipality_id)));
$$;
revoke all on function private.fine_in_scope(uuid) from public;
grant execute on function private.fine_in_scope(uuid) to authenticated;

create or replace function public.next_driver_reference(p_municipality_id uuid) returns text
language plpgsql security definer set search_path='' as $$
declare n bigint; mcode text;
begin
 if not (select private.same_municipality(p_municipality_id)) or not (select private.authorize('drivers.create')) then raise exception 'Acesso negado'; end if;
 select code into mcode from public.municipalities where id=p_municipality_id;
 insert into public.driver_numbering_counters(municipality_id,current_value) values(p_municipality_id,1)
 on conflict(municipality_id) do update set current_value=public.driver_numbering_counters.current_value+1, updated_at=now()
 returning current_value into n;
 return 'MTX-'||mcode||'-'||lpad(n::text,6,'0');
end; $$;
revoke all on function public.next_driver_reference(uuid) from public;
grant execute on function public.next_driver_reference(uuid) to authenticated;

create or replace function public.next_fine_reference(p_municipality_id uuid) returns text
language plpgsql security definer set search_path='' as $$
declare n bigint; y integer:=extract(year from now()); mcode text;
begin
 if not (select private.same_municipality(p_municipality_id)) or not (select private.authorize('fines.create')) then raise exception 'Acesso negado'; end if;
 select code into mcode from public.municipalities where id=p_municipality_id;
 insert into public.fine_numbering_counters(municipality_id,year,current_value) values(p_municipality_id,y,1)
 on conflict(municipality_id,year) do update set current_value=public.fine_numbering_counters.current_value+1, updated_at=now()
 returning current_value into n;
 return 'MLT-'||mcode||'-'||y::text||'-'||lpad(n::text,6,'0');
end; $$;
revoke all on function public.next_fine_reference(uuid) from public;
grant execute on function public.next_fine_reference(uuid) to authenticated;

grant select,insert,update,delete on public.drivers,public.driver_vehicles,public.fine_types,public.fines to authenticated,service_role;
grant select,insert,update on public.driver_numbering_counters,public.fine_numbering_counters to authenticated,service_role;
revoke all on public.drivers,public.driver_vehicles,public.fine_types,public.fines,public.driver_numbering_counters,public.fine_numbering_counters from anon;

alter table public.drivers enable row level security;
alter table public.driver_vehicles enable row level security;
alter table public.fine_types enable row level security;
alter table public.fines enable row level security;
alter table public.driver_numbering_counters enable row level security;
alter table public.fine_numbering_counters enable row level security;

create policy drivers_select on public.drivers for select to authenticated using ((select private.same_municipality(municipality_id)) and (select private.authorize('drivers.view')));
create policy drivers_insert on public.drivers for insert to authenticated with check ((select private.same_municipality(municipality_id)) and (select private.authorize('drivers.create')));
create policy drivers_update on public.drivers for update to authenticated using ((select private.same_municipality(municipality_id)) and (select private.authorize('drivers.update'))) with check ((select private.same_municipality(municipality_id)) and (select private.authorize('drivers.update')));

create policy driver_vehicles_select on public.driver_vehicles for select to authenticated using ((select private.same_municipality(municipality_id)) and (select private.driver_in_scope(driver_id)));
create policy driver_vehicles_manage on public.driver_vehicles for all to authenticated using ((select private.same_municipality(municipality_id)) and (select private.authorize('drivers.update'))) with check ((select private.same_municipality(municipality_id)) and (select private.authorize('drivers.update')));

create policy fine_types_select on public.fine_types for select to authenticated using ((select private.same_municipality(municipality_id)) and (select private.authorize('fines.view')));
create policy fine_types_manage on public.fine_types for all to authenticated using ((select private.same_municipality(municipality_id)) and (select private.authorize('fine_types.manage'))) with check ((select private.same_municipality(municipality_id)) and (select private.authorize('fine_types.manage')));

create policy fines_select on public.fines for select to authenticated using ((select private.same_municipality(municipality_id)) and (select private.authorize('fines.view')));
create policy fines_insert on public.fines for insert to authenticated with check ((select private.same_municipality(municipality_id)) and (select private.authorize('fines.create')));
create policy fines_update_admin on public.fines for update to authenticated using ((select private.same_municipality(municipality_id)) and (select private.current_role()) in ('super_admin','admin_municipal')) with check ((select private.same_municipality(municipality_id)));

create policy driver_counters_select on public.driver_numbering_counters for select to authenticated using ((select private.same_municipality(municipality_id)) and (select private.current_role()) in ('super_admin','admin_municipal'));
create policy fine_counters_select on public.fine_numbering_counters for select to authenticated using ((select private.same_municipality(municipality_id)) and (select private.current_role()) in ('super_admin','admin_municipal'));

create trigger drivers_updated_at before update on public.drivers for each row execute function public.set_updated_at();
create trigger fine_types_updated_at before update on public.fine_types for each row execute function public.set_updated_at();
create trigger fines_updated_at before update on public.fines for each row execute function public.set_updated_at();
